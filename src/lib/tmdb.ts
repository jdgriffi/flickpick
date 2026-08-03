import { DEMO_MOVIES } from "./demo-data";
import type { DiscoverResponse, Movie, MovieFilters } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_TMDB_KEY");
  }

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 30 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

type TmdbDiscover = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovie[];
};

type TmdbMovieDetails = TmdbMovie & {
  external_ids?: { imdb_id: string | null };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string }>;
    }>;
  };
};

function decadeRange(decade: string): { gte: string; lte: string } | null {
  const start = Number(decade);
  if (!Number.isFinite(start)) return null;
  return {
    gte: `${start}-01-01`,
    lte: `${start + 9}-12-31`,
  };
}

function mapMovie(m: TmdbMovie, extras?: Partial<Movie>): Movie {
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: m.release_date ?? "",
    year: Number.isFinite(year) ? year : null,
    tmdbScore: m.vote_average && m.vote_average > 0 ? Math.round(m.vote_average * 10) / 10 : null,
    voteCount: m.vote_count ?? 0,
    imdbId: extras?.imdbId ?? null,
    imdbScore: extras?.imdbScore ?? null,
    genreIds: m.genre_ids ?? [],
    certification: extras?.certification ?? null,
  };
}

function usCertification(details: TmdbMovieDetails): string | null {
  const us = details.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  const cert = us?.release_dates.find((d) => d.certification)?.certification;
  return cert || null;
}

async function enrichMovies(movies: TmdbMovie[], forcedCert?: string): Promise<Movie[]> {
  return Promise.all(
    movies.map(async (movie) => {
      try {
        const details = await tmdbFetch<TmdbMovieDetails>(`/movie/${movie.id}`, {
          append_to_response: "external_ids,release_dates",
          language: "en-US",
        });
        return mapMovie(movie, {
          imdbId: details.external_ids?.imdb_id ?? null,
          certification: forcedCert || usCertification(details),
        });
      } catch {
        return mapMovie(movie, { certification: forcedCert || null });
      }
    }),
  );
}

async function fetchOmdbScores(imdbIds: Array<string | null>): Promise<Map<string, number>> {
  const apiKey = process.env.OMDB_API_KEY;
  const scores = new Map<string, number>();
  if (!apiKey) return scores;

  const unique = [...new Set(imdbIds.filter(Boolean))] as string[];
  await Promise.all(
    unique.map(async (imdbId) => {
      try {
        const url = new URL("https://www.omdbapi.com/");
        url.searchParams.set("i", imdbId);
        url.searchParams.set("apikey", apiKey);
        const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
        if (!res.ok) return;
        const data = (await res.json()) as { imdbRating?: string; Response?: string };
        if (data.Response === "False" || !data.imdbRating || data.imdbRating === "N/A") return;
        const score = Number(data.imdbRating);
        if (Number.isFinite(score)) scores.set(imdbId, score);
      } catch {
        // Ignore individual OMDb failures
      }
    }),
  );

  return scores;
}

function tmdbSortParam(sort?: string): string {
  if (!sort || sort.startsWith("imdb.")) return "vote_average.desc";
  return sort;
}

function applyClientScoreLogic(
  movies: Movie[],
  filters: MovieFilters,
  scoreSource: "imdb" | "tmdb",
): Movie[] {
  const minScore = filters.minScore ? Number(filters.minScore) : null;
  let list = [...movies];

  const scoreOf = (m: Movie) =>
    scoreSource === "imdb" ? (m.imdbScore ?? m.tmdbScore) : (m.tmdbScore ?? m.imdbScore);

  if (minScore != null && Number.isFinite(minScore)) {
    list = list.filter((m) => {
      const score = scoreOf(m);
      return score != null && score >= minScore;
    });
  }

  if (filters.sort === "imdb.desc") {
    list.sort((a, b) => (scoreOf(b) ?? 0) - (scoreOf(a) ?? 0));
  } else if (filters.sort === "imdb.asc") {
    list.sort((a, b) => (scoreOf(a) ?? 0) - (scoreOf(b) ?? 0));
  }

  return list;
}

function filterDemoMovies(filters: MovieFilters): DiscoverResponse {
  let results = [...DEMO_MOVIES];

  if (filters.genre) {
    const genreId = Number(filters.genre);
    results = results.filter((m) => m.genreIds.includes(genreId));
  }
  if (filters.certification) {
    results = results.filter((m) => m.certification === filters.certification);
  }
  if (filters.decade) {
    const range = decadeRange(filters.decade);
    if (range) {
      const start = Number(range.gte.slice(0, 4));
      const end = Number(range.lte.slice(0, 4));
      results = results.filter((m) => m.year != null && m.year >= start && m.year <= end);
    }
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter((m) => m.title.toLowerCase().includes(q));
  }

  results = applyClientScoreLogic(results, filters, "imdb");

  return {
    page: 1,
    totalPages: 1,
    totalResults: results.length,
    results,
    scoreSource: "imdb",
    demo: true,
    message:
      "Demo mode — add TMDB_API_KEY to .env.local for live results. Optional OMDB_API_KEY unlocks live IMDb scores.",
  };
}

export async function discoverMovies(filters: MovieFilters): Promise<DiscoverResponse> {
  if (!getApiKey()) {
    return filterDemoMovies(filters);
  }

  const params: Record<string, string> = {
    language: "en-US",
    include_adult: "false",
    include_video: "false",
    page: filters.page || "1",
    sort_by: tmdbSortParam(filters.sort),
    "vote_count.gte": "50",
    watch_region: "US",
  };

  if (filters.genre) params.with_genres = filters.genre;
  if (filters.providers) {
    params.with_watch_providers = filters.providers.split(",").join("|");
    params.with_watch_monetization_types = "flatrate";
  }
  if (filters.certification) {
    params.certification_country = "US";
    params.certification = filters.certification;
  }
  if (filters.decade) {
    const range = decadeRange(filters.decade);
    if (range) {
      params["primary_release_date.gte"] = range.gte;
      params["primary_release_date.lte"] = range.lte;
    }
  }
  if (filters.minScore) {
    // TMDB score is a strong proxy for IMDb on the same 0–10 scale.
    params["vote_average.gte"] = filters.minScore;
  }

  let data: TmdbDiscover;
  if (filters.query?.trim()) {
    data = await tmdbFetch<TmdbDiscover>("/search/movie", {
      query: filters.query.trim(),
      language: "en-US",
      include_adult: "false",
      page: params.page,
    });
  } else {
    data = await tmdbFetch<TmdbDiscover>("/discover/movie", params);
  }

  const enriched = await enrichMovies(data.results, filters.certification);
  const omdbScores = await fetchOmdbScores(enriched.map((m) => m.imdbId));
  const withScores = enriched.map((m) => ({
    ...m,
    imdbScore: m.imdbId ? (omdbScores.get(m.imdbId) ?? null) : null,
  }));

  const scoreSource: "imdb" | "tmdb" = omdbScores.size > 0 ? "imdb" : "tmdb";
  const results = applyClientScoreLogic(withScores, filters, scoreSource);

  return {
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
    results,
    scoreSource,
    message:
      scoreSource === "imdb"
        ? undefined
        : "Showing TMDB scores. Add OMDB_API_KEY for live IMDb ratings.",
  };
}
