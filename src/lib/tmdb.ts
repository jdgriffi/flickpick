import { DEMO_MOVIES, DEMO_TV } from "./demo-data";
import {
  decadeYearRange,
  expandWatchProviderIds,
  FREE_STREAMING_PROVIDERS,
  FREE_STREAMING_VALUE,
  isKnownStreamingBrand,
  knownStreamingProviderIds,
  providerShortName,
  ratingScaleFor,
} from "./constants";
import type { DiscoverResponse, MediaType, Movie, MovieFilters } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

function parseMediaType(raw?: string): MediaType {
  return raw === "tv" ? "tv" : "movie";
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

type TmdbResult = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

type TmdbDiscover = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbResult[];
};

type TmdbWatchProvider = {
  provider_id: number;
  provider_name: string;
  display_priority?: number;
};

type TmdbDetails = TmdbResult & {
  external_ids?: { imdb_id: string | null };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string }>;
    }>;
  };
  content_ratings?: {
    results: Array<{
      iso_3166_1: string;
      rating: string;
    }>;
  };
  "watch/providers"?: {
    results?: {
      US?: {
        flatrate?: TmdbWatchProvider[];
        free?: TmdbWatchProvider[];
        ads?: TmdbWatchProvider[];
      };
    };
  };
};

function parseList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((c) => c.trim()).filter(Boolean))];
}

function parseCertifications(raw?: string): string[] {
  return parseList(raw);
}

function parseGenreIds(raw?: string): number[] {
  return parseList(raw)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

type DecadeRange = { start: number; end: number };

function parseDecadeRanges(raw?: string): DecadeRange[] {
  return parseList(raw)
    .map(decadeYearRange)
    .filter((r): r is DecadeRange => r != null)
    .sort((a, b) => a.start - b.start);
}

function certificationIndexes(certs: string[], scale: readonly string[]): number[] {
  return certs
    .map((c) => scale.indexOf(c))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
}

function isContiguousScale(certs: string[], scale: readonly string[]): boolean {
  const idxs = certificationIndexes(certs, scale);
  if (idxs.length !== certs.length || idxs.length === 0) return false;
  for (let i = 1; i < idxs.length; i++) {
    if (idxs[i] !== idxs[i - 1] + 1) return false;
  }
  return true;
}

function isContiguousDecadeRanges(ranges: DecadeRange[]): boolean {
  if (ranges.length === 0) return false;
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start !== ranges[i - 1].end + 1) return false;
  }
  return true;
}

function dateGteKey(mediaType: MediaType): string {
  return mediaType === "tv" ? "first_air_date.gte" : "primary_release_date.gte";
}

function dateLteKey(mediaType: MediaType): string {
  return mediaType === "tv" ? "first_air_date.lte" : "primary_release_date.lte";
}

/** Apply TMDB certification params. Returns whether parallel per-cert fetches are needed. */
function applyCertificationParams(
  params: Record<string, string>,
  certs: string[],
  mediaType: MediaType,
): boolean {
  if (certs.length === 0) return false;

  const scale = ratingScaleFor(mediaType);
  params.certification_country = "US";

  if (certs.length === 1) {
    params.certification = certs[0];
    return false;
  }

  if (isContiguousScale(certs, scale)) {
    const idxs = certificationIndexes(certs, scale);
    params["certification.gte"] = scale[idxs[0]];
    params["certification.lte"] = scale[idxs[idxs.length - 1]];
    return false;
  }

  return true;
}

/** Apply decade date range. Returns whether parallel per-decade fetches are needed. */
function applyDecadeParams(
  params: Record<string, string>,
  decades: DecadeRange[],
  mediaType: MediaType,
): boolean {
  if (decades.length === 0) return false;

  if (decades.length === 1 || isContiguousDecadeRanges(decades)) {
    params[dateGteKey(mediaType)] = `${decades[0].start}-01-01`;
    params[dateLteKey(mediaType)] = `${decades[decades.length - 1].end}-12-31`;
    return false;
  }

  return true;
}

function filterByCertifications(movies: Movie[], certs: string[]): Movie[] {
  if (!certs.length) return movies;
  const allowed = new Set(certs);
  return movies.filter((m) => m.certification != null && allowed.has(m.certification));
}

function filterByGenres(movies: Movie[], genreIds: number[]): Movie[] {
  if (!genreIds.length) return movies;
  return movies.filter((m) => genreIds.some((id) => m.genreIds.includes(id)));
}

function filterByDecades(movies: Movie[], decades: DecadeRange[]): Movie[] {
  if (!decades.length) return movies;
  return movies.filter((m) => {
    if (m.year == null) return false;
    return decades.some((r) => m.year! >= r.start && m.year! <= r.end);
  });
}

function mergeDiscoverPages(pages: TmdbDiscover[], page: number): TmdbDiscover {
  const seen = new Set<number>();
  const merged: TmdbResult[] = [];
  for (const chunk of pages) {
    for (const item of chunk.results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  return {
    page,
    total_pages: Math.max(...pages.map((p) => p.total_pages), 1),
    total_results: pages.reduce((sum, p) => sum + p.total_results, 0),
    results: merged,
  };
}

function mapTitle(m: TmdbResult, mediaType: MediaType, extras?: Partial<Movie>): Movie {
  const date = mediaType === "tv" ? m.first_air_date : m.release_date;
  const year = date ? Number(date.slice(0, 4)) : null;
  return {
    id: m.id,
    mediaType,
    title: (mediaType === "tv" ? m.name : m.title) ?? "",
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: date ?? "",
    year: Number.isFinite(year) ? year : null,
    tmdbScore: m.vote_average && m.vote_average > 0 ? Math.round(m.vote_average * 10) / 10 : null,
    voteCount: m.vote_count ?? 0,
    imdbId: extras?.imdbId ?? null,
    imdbScore: extras?.imdbScore ?? null,
    genreIds: m.genre_ids ?? [],
    certification: extras?.certification ?? null,
    providers: extras?.providers ?? [],
  };
}

function usMovieCertification(details: TmdbDetails): string | null {
  const us = details.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  const cert = us?.release_dates.find((d) => d.certification)?.certification;
  return cert || null;
}

function usTvCertification(details: TmdbDetails): string | null {
  const us = details.content_ratings?.results.find((r) => r.iso_3166_1 === "US");
  return us?.rating || null;
}

const KNOWN_PROVIDER_IDS = new Set(knownStreamingProviderIds());

function usStreamingProviders(details: TmdbDetails): string[] {
  const us = details["watch/providers"]?.results?.US;
  const combined = [...(us?.flatrate ?? []), ...(us?.free ?? []), ...(us?.ads ?? [])];
  const byId = new Map<number, TmdbWatchProvider>();
  for (const p of combined) {
    const existing = byId.get(p.provider_id);
    if (!existing || (p.display_priority ?? 99) < (existing.display_priority ?? 99)) {
      byId.set(p.provider_id, p);
    }
  }
  const sorted = [...byId.values()].sort(
    (a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99),
  );

  const known: string[] = [];
  const other: string[] = [];
  for (const p of sorted) {
    const label = providerShortName(p.provider_id, p.provider_name);
    const bucket = KNOWN_PROVIDER_IDS.has(p.provider_id) || isKnownStreamingBrand(label) ? known : other;
    if (!bucket.includes(label)) bucket.push(label);
  }

  return [...known, ...other].slice(0, 4);
}

function applyProviderParams(params: Record<string, string>, providersRaw?: string) {
  const selected = parseList(providersRaw);
  if (!selected.length) return;

  const wantFree = selected.includes(FREE_STREAMING_VALUE);
  const paidIds = expandWatchProviderIds(selected.filter((id) => id !== FREE_STREAMING_VALUE));
  const freeIds = FREE_STREAMING_PROVIDERS.map((p) => String(p.id));

  if (wantFree && paidIds.length) {
    params.with_watch_providers = [...paidIds, ...freeIds].join("|");
    params.with_watch_monetization_types = "flatrate|free|ads";
  } else if (wantFree) {
    params.with_watch_providers = freeIds.join("|");
    params.with_watch_monetization_types = "free|ads";
  } else {
    params.with_watch_providers = paidIds.join("|");
    params.with_watch_monetization_types = "flatrate";
  }
}

async function enrichTitles(items: TmdbResult[], mediaType: MediaType): Promise<Movie[]> {
  const path = mediaType === "tv" ? "tv" : "movie";
  const append =
    mediaType === "tv"
      ? "external_ids,content_ratings,watch/providers"
      : "external_ids,release_dates,watch/providers";

  return Promise.all(
    items.map(async (item) => {
      try {
        const details = await tmdbFetch<TmdbDetails>(`/${path}/${item.id}`, {
          append_to_response: append,
          language: "en-US",
        });
        return mapTitle(item, mediaType, {
          imdbId: details.external_ids?.imdb_id ?? null,
          certification:
            mediaType === "tv" ? usTvCertification(details) : usMovieCertification(details),
          providers: usStreamingProviders(details),
        });
      } catch {
        return mapTitle(item, mediaType);
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

function tmdbSortParam(sort: string | undefined, mediaType: MediaType): string {
  if (!sort || sort.startsWith("imdb.")) return "vote_average.desc";

  if (mediaType === "tv") {
    if (sort.startsWith("primary_release_date.")) {
      return sort.replace("primary_release_date", "first_air_date");
    }
    if (sort.startsWith("title.")) {
      return sort.replace("title", "name");
    }
  } else {
    if (sort.startsWith("first_air_date.")) {
      return sort.replace("first_air_date", "primary_release_date");
    }
    if (sort.startsWith("name.")) {
      return sort.replace("name", "title");
    }
  }

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

function filterDemo(filters: MovieFilters, mediaType: MediaType): DiscoverResponse {
  let results = [...(mediaType === "tv" ? DEMO_TV : DEMO_MOVIES)];
  const genres = parseGenreIds(filters.genre);
  const certs = parseCertifications(filters.certification);
  const decades = parseDecadeRanges(filters.decade);

  results = filterByGenres(results, genres);
  results = filterByCertifications(results, certs);
  results = filterByDecades(results, decades);
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
    mediaType,
    demo: true,
    message:
      "Demo mode — add TMDB_API_KEY to .env.local for live results. Optional OMDB_API_KEY unlocks live IMDb scores.",
  };
}

export async function discoverMovies(filters: MovieFilters): Promise<DiscoverResponse> {
  const mediaType = parseMediaType(filters.mediaType);

  if (!getApiKey()) {
    return filterDemo(filters, mediaType);
  }

  const genres = parseGenreIds(filters.genre);
  const certs = parseCertifications(filters.certification);
  const decades = parseDecadeRanges(filters.decade);
  const discoverPath = mediaType === "tv" ? "/discover/tv" : "/discover/movie";
  const searchPath = mediaType === "tv" ? "/search/tv" : "/search/movie";

  const params: Record<string, string> = {
    language: "en-US",
    include_adult: "false",
    page: filters.page || "1",
    sort_by: tmdbSortParam(filters.sort, mediaType),
    "vote_count.gte": "50",
    watch_region: "US",
  };

  if (mediaType === "movie") {
    params.include_video = "false";
  }

  if (genres.length) params.with_genres = genres.join("|");
  applyProviderParams(params, filters.providers);
  const needsCertParallel = applyCertificationParams(params, certs, mediaType);
  const needsDecadeParallel = applyDecadeParams(params, decades, mediaType);
  if (filters.minScore) {
    params["vote_average.gte"] = filters.minScore;
  }
  if (filters.keyword && !filters.query?.trim()) {
    params.with_keywords = filters.keyword;
    // Keyword tags are often on lower-vote titles; the default 50 gate empties many vibes.
    params["vote_count.gte"] = "1";
  }
  if (filters.person && !filters.query?.trim()) {
    params.with_people = filters.person;
    params["vote_count.gte"] = "1";
  }
  if (filters.company && !filters.query?.trim()) {
    params.with_companies = filters.company;
    params["vote_count.gte"] = "1";
  }

  const pageNum = Number(params.page) || 1;
  const gte = dateGteKey(mediaType);
  const lte = dateLteKey(mediaType);

  let data: TmdbDiscover;
  if (filters.query?.trim()) {
    data = await tmdbFetch<TmdbDiscover>(searchPath, {
      query: filters.query.trim(),
      language: "en-US",
      include_adult: "false",
      page: params.page,
    });
  } else if (needsDecadeParallel && needsCertParallel) {
    delete params.certification;
    delete params["certification.gte"];
    delete params["certification.lte"];
    delete params.certification_country;
    const pages = await Promise.all(
      decades.map((range) =>
        tmdbFetch<TmdbDiscover>(discoverPath, {
          ...params,
          [gte]: `${range.start}-01-01`,
          [lte]: `${range.end}-12-31`,
        }),
      ),
    );
    data = mergeDiscoverPages(pages, pageNum);
  } else if (needsDecadeParallel) {
    const pages = await Promise.all(
      decades.map((range) =>
        tmdbFetch<TmdbDiscover>(discoverPath, {
          ...params,
          [gte]: `${range.start}-01-01`,
          [lte]: `${range.end}-12-31`,
        }),
      ),
    );
    data = mergeDiscoverPages(pages, pageNum);
  } else if (needsCertParallel) {
    const pages = await Promise.all(
      certs.map((cert) =>
        tmdbFetch<TmdbDiscover>(discoverPath, {
          ...params,
          certification_country: "US",
          certification: cert,
        }),
      ),
    );
    data = mergeDiscoverPages(pages, pageNum);
  } else {
    data = await tmdbFetch<TmdbDiscover>(discoverPath, params);
  }

  let enriched = await enrichTitles(data.results, mediaType);
  if (filters.query?.trim()) {
    enriched = filterByGenres(enriched, genres);
    enriched = filterByCertifications(enriched, certs);
    enriched = filterByDecades(enriched, decades);
  } else if (needsDecadeParallel && needsCertParallel && certs.length) {
    enriched = filterByCertifications(enriched, certs);
  }

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
    mediaType,
  };
}
