import { DEMO_MOVIES, DEMO_TV } from "./demo-data";
import { genreName, providerShortName } from "./constants";
import type {
  CompanyFilter,
  CreditPerson,
  KeywordTag,
  MediaType,
  Movie,
  TitleDetail,
  VibeTag,
  WatchMonetization,
  WatchOffer,
} from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CAST_LIMIT = 8;
const PRODUCER_LIMIT = 8;
const SIMILAR_LIMIT = 12;
const KEYWORD_LIMIT = 12;

const KEYWORD_NOISE = new Set([
  "duringcreditsstinger",
  "aftercreditsstinger",
  "based on novel or book",
]);

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISSING_TMDB_KEY");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

type TmdbRecResult = {
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

function mapRelatedTitle(item: TmdbRecResult, mediaType: MediaType): Movie {
  const date = mediaType === "tv" ? item.first_air_date : item.release_date;
  const year = date ? Number(date.slice(0, 4)) : null;
  return {
    id: item.id,
    mediaType,
    title: (mediaType === "tv" ? item.name : item.title) ?? "",
    overview: item.overview || "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: date ?? "",
    year: Number.isFinite(year) ? year : null,
    tmdbScore:
      item.vote_average && item.vote_average > 0
        ? Math.round(item.vote_average * 10) / 10
        : null,
    voteCount: item.vote_count ?? 0,
    imdbId: null,
    imdbScore: null,
    genreIds: item.genre_ids ?? [],
    certification: null,
    providers: [],
  };
}

async function fetchRelatedTitles(mediaType: MediaType, id: number): Promise<Movie[]> {
  const base = mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;
  const params = { language: "en-US", page: "1" };

  const [recs, similar] = await Promise.all([
    tmdbFetch<{ results?: TmdbRecResult[] }>(`${base}/recommendations`, params).catch(
      () => ({ results: [] as TmdbRecResult[] }),
    ),
    tmdbFetch<{ results?: TmdbRecResult[] }>(`${base}/similar`, params).catch(
      () => ({ results: [] as TmdbRecResult[] }),
    ),
  ]);

  const seen = new Set<number>([id]);
  const merged: Movie[] = [];
  for (const item of [...(recs.results ?? []), ...(similar.results ?? [])]) {
    if (seen.has(item.id) || !item.poster_path) continue;
    seen.add(item.id);
    merged.push(mapRelatedTitle(item, mediaType));
    if (merged.length >= SIMILAR_LIMIT) break;
  }
  return merged;
}

function demoRelated(mediaType: MediaType, id: number): Movie[] {
  const pool = mediaType === "tv" ? DEMO_TV : DEMO_MOVIES;
  return pool.filter((m) => m.id !== id).slice(0, SIMILAR_LIMIT);
}

function mapKeywords(
  raw: Array<{ id: number; name: string }> | undefined,
): KeywordTag[] {
  if (!raw?.length) return [];
  const seen = new Set<number>();
  const out: KeywordTag[] = [];
  for (const item of raw) {
    const name = item.name?.trim();
    if (!name || seen.has(item.id)) continue;
    if (KEYWORD_NOISE.has(name.toLowerCase())) continue;
    seen.add(item.id);
    out.push({ id: item.id, name });
    if (out.length >= KEYWORD_LIMIT) break;
  }
  return out;
}

function keywordsFromDetails(details: TmdbTitlePayload): KeywordTag[] {
  const block = details.keywords;
  return mapKeywords(block?.keywords ?? block?.results);
}

/** Prefer TMDB keywords; top up with genres so sparse titles still get vibes. */
function buildVibes(
  details: TmdbTitlePayload,
  genres: Array<{ id: number; name: string }>,
): VibeTag[] {
  const vibes: VibeTag[] = keywordsFromDetails(details).map((k) => ({
    ...k,
    source: "keyword" as const,
  }));
  const names = new Set(vibes.map((v) => v.name.toLowerCase()));

  for (const genre of genres) {
    if (vibes.length >= KEYWORD_LIMIT) break;
    const name = genre.name?.trim();
    if (!name || names.has(name.toLowerCase())) continue;
    names.add(name.toLowerCase());
    vibes.push({ id: genre.id, name, source: "genre" });
  }

  return vibes;
}

function demoVibes(mediaType: MediaType): VibeTag[] {
  return mediaType === "tv"
    ? [
        { id: 1, name: "crime", source: "keyword" },
        { id: 2, name: "anti hero", source: "keyword" },
        { id: 18, name: "Drama", source: "genre" },
      ]
    : [
        { id: 4, name: "twist ending", source: "keyword" },
        { id: 5, name: "psychological", source: "keyword" },
        { id: 53, name: "Thriller", source: "genre" },
      ];
}

type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number;
};

type TmdbRegionProviders = {
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
};

type TmdbCredits = {
  cast?: Array<{
    id: number;
    name: string;
    character?: string;
    profile_path: string | null;
    order?: number;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job?: string;
    profile_path: string | null;
  }>;
};

type TmdbTitlePayload = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  vote_average?: number;
  runtime?: number | null;
  episode_run_time?: number[];
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  networks?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string }>;
  created_by?: Array<{ id: number; name: string; profile_path: string | null }>;
  external_ids?: { imdb_id: string | null };
  credits?: TmdbCredits;
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string; release_date: string; type: number }>;
    }>;
  };
  content_ratings?: {
    results: Array<{ iso_3166_1: string; rating: string }>;
  };
  "watch/providers"?: {
    results?: {
      US?: TmdbRegionProviders;
    };
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
};

function yearFromDate(date?: string | null): number | null {
  if (!date || date.length < 4) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

function usMovieCertification(details: TmdbTitlePayload): string | null {
  const us = details.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  const cert = us?.release_dates.find((d) => d.certification)?.certification;
  return cert || null;
}

function usTvCertification(details: TmdbTitlePayload): string | null {
  const us = details.content_ratings?.results.find((r) => r.iso_3166_1 === "US");
  return us?.rating || null;
}

function usReleaseDates(details: TmdbTitlePayload): {
  theatrical: string | null;
  digital: string | null;
} {
  const us = details.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  if (!us) return { theatrical: null, digital: null };

  const byType = (type: number) => {
    const hits = us.release_dates
      .filter((d) => d.type === type && d.release_date)
      .map((d) => d.release_date.slice(0, 10))
      .sort();
    return hits[0] ?? null;
  };

  return {
    theatrical: byType(3),
    digital: byType(4),
  };
}

function mapProviders(
  list: TmdbProvider[] | undefined,
  monetization: WatchMonetization,
): WatchOffer[] {
  if (!list?.length) return [];

  const byBrand = new Map<string, WatchOffer>();
  const sorted = [...list].sort(
    (a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99),
  );

  for (const p of sorted) {
    const name = providerShortName(p.provider_id, p.provider_name);
    const existing = byBrand.get(name);
    const logoPath = p.logo_path ?? null;
    if (!existing) {
      byBrand.set(name, {
        providerId: p.provider_id,
        name,
        monetization,
        logoPath,
      });
      continue;
    }
    // Prefer keeping an offer that already has a logo; otherwise adopt this one.
    if (!existing.logoPath && logoPath) {
      byBrand.set(name, { ...existing, logoPath });
    }
  }

  return [...byBrand.values()];
}

function seriesWatchOffers(us?: TmdbRegionProviders): WatchOffer[] {
  if (!us) return [];
  const offers = [
    ...mapProviders(us.flatrate, "flatrate"),
    ...mapProviders(us.free, "free"),
    ...mapProviders(us.ads, "ads"),
    ...mapProviders(us.rent, "rent"),
    ...mapProviders(us.buy, "buy"),
  ];

  const seen = new Set<string>();
  return offers.filter((o) => {
    const key = `${o.name}:${o.monetization}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function seasonProviderMap(
  tvId: number,
  seasonCount: number,
): Promise<Map<string, number[]> | null> {
  const maxSeasons = Math.min(Math.max(seasonCount, 0), 12);
  if (maxSeasons < 1) return null;

  const seasonNums = Array.from({ length: maxSeasons }, (_, i) => i + 1);
  const pages = await Promise.all(
    seasonNums.map(async (season) => {
      try {
        const data = await tmdbFetch<{ results?: { US?: TmdbRegionProviders } }>(
          `/tv/${tvId}/season/${season}/watch/providers`,
        );
        return { season, us: data.results?.US };
      } catch {
        return { season, us: undefined };
      }
    }),
  );

  const map = new Map<string, number[]>();
  let anyData = false;

  for (const { season, us } of pages) {
    if (!us) continue;
    const buckets: Array<[WatchMonetization, TmdbProvider[] | undefined]> = [
      ["flatrate", us.flatrate],
      ["free", us.free],
      ["ads", us.ads],
      ["rent", us.rent],
      ["buy", us.buy],
    ];
    for (const [monetization, list] of buckets) {
      for (const p of list ?? []) {
        anyData = true;
        const key = `${p.provider_id}:${monetization}`;
        const seasons = map.get(key) ?? [];
        if (!seasons.includes(season)) seasons.push(season);
        map.set(key, seasons.sort((a, b) => a - b));
      }
    }
  }

  return anyData ? map : null;
}

function formatSeasonList(seasons: number[]): string {
  if (seasons.length === 0) return "";
  const ranges: string[] = [];
  let start = seasons[0];
  let prev = seasons[0];
  for (let i = 1; i <= seasons.length; i++) {
    const cur = seasons[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? `S${start}` : `S${start}–S${prev}`);
    start = cur;
    prev = cur;
  }
  return ranges.join(", ");
}

async function fetchOmdbScore(imdbId: string | null): Promise<number | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || !imdbId) return null;
  try {
    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("i", imdbId);
    url.searchParams.set("apikey", apiKey);
    const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { imdbRating?: string; Response?: string };
    if (data.Response === "False" || !data.imdbRating || data.imdbRating === "N/A") return null;
    const score = Number(data.imdbRating);
    return Number.isFinite(score) ? score : null;
  } catch {
    return null;
  }
}

function demoDetail(mediaType: MediaType, id: number): TitleDetail | null {
  const item = (mediaType === "tv" ? DEMO_TV : DEMO_MOVIES).find((m) => m.id === id);
  if (!item) return null;

  return {
    id: item.id,
    mediaType,
    title: item.title,
    overview: item.overview,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    year: item.year,
    tmdbScore: item.tmdbScore,
    imdbId: item.imdbId,
    imdbScore: item.imdbScore,
    certification: item.certification,
    genres: item.genreIds.map((gid) => genreName(gid, mediaType)),
    cast: [],
    directors: [],
    creators: [],
    producers: [],
    productionCompanies: [],
    runtimeMinutes: mediaType === "movie" ? 120 : 45,
    status: mediaType === "tv" ? "Ended" : null,
    numberOfSeasons: mediaType === "tv" ? 5 : null,
    numberOfEpisodes: mediaType === "tv" ? 50 : null,
    networks: mediaType === "tv" ? ["Demo Network"] : [],
    firstAirDate: mediaType === "tv" ? item.releaseDate : null,
    lastAirDate: mediaType === "tv" ? item.releaseDate : null,
    theatricalReleaseDate: mediaType === "movie" ? item.releaseDate : null,
    digitalReleaseDate: null,
    releaseDate: item.releaseDate,
    watchOffers: item.providers.map((name, index) => ({
      providerId: index + 1,
      name,
      monetization: "flatrate" as const,
      logoPath: null,
    })),
    watchNote: "Demo mode — add TMDB_API_KEY for full credits and live watch data.",
    vibes: demoVibes(mediaType),
    similar: demoRelated(mediaType, item.id),
    demo: true,
  };
}

export async function getTitleDetail(mediaType: MediaType, id: number): Promise<TitleDetail> {
  if (!getApiKey()) {
    const demo = demoDetail(mediaType, id);
    if (!demo) throw new Error("Title not found");
    return demo;
  }

  const path = mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;
  const append =
    mediaType === "tv"
      ? "external_ids,content_ratings,credits,watch/providers,keywords"
      : "external_ids,release_dates,credits,watch/providers,keywords";

  const details = await tmdbFetch<TmdbTitlePayload>(path, {
    append_to_response: append,
    language: "en-US",
  });

  const cast: CreditPerson[] = [...(details.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, CAST_LIMIT)
    .map((c) => ({
      id: c.id,
      name: c.name,
      role: c.character || "Cast",
      profilePath: c.profile_path,
    }));

  const directors: CreditPerson[] =
    mediaType === "movie"
      ? (details.credits?.crew ?? [])
          .filter((c) => c.job === "Director")
          .map((c) => ({
            id: c.id,
            name: c.name,
            role: "Director",
            profilePath: c.profile_path,
          }))
      : [];

  const creators: CreditPerson[] =
    mediaType === "tv"
      ? (details.created_by ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          role: "Creator",
          profilePath: c.profile_path,
        }))
      : [];

  const producerJobs = new Set(["Producer", "Executive Producer"]);
  const seenProducerIds = new Set<number>();
  const producers: CreditPerson[] = [];
  for (const c of details.credits?.crew ?? []) {
    if (!c.job || !producerJobs.has(c.job) || seenProducerIds.has(c.id)) continue;
    seenProducerIds.add(c.id);
    producers.push({
      id: c.id,
      name: c.name,
      role: c.job,
      profilePath: c.profile_path,
    });
    if (producers.length >= PRODUCER_LIMIT) break;
  }

  const productionCompanies: CompanyFilter[] = (details.production_companies ?? [])
    .filter((c) => c.id && c.name?.trim())
    .map((c) => ({ id: c.id, name: c.name.trim() }));

  const imdbId = details.external_ids?.imdb_id ?? null;
  const [imdbScore, similar] = await Promise.all([
    fetchOmdbScore(imdbId),
    fetchRelatedTitles(mediaType, id),
  ]);
  const releases = mediaType === "movie" ? usReleaseDates(details) : { theatrical: null, digital: null };

  let watchOffers = seriesWatchOffers(details["watch/providers"]?.results?.US);
  let watchNote: string | null = null;

  if (mediaType === "tv") {
    const seasonCount = details.number_of_seasons ?? 0;
    const seasonMap = await seasonProviderMap(id, seasonCount);
    if (seasonMap) {
      watchOffers = watchOffers.map((offer) => {
        const seasons = seasonMap.get(`${offer.providerId}:${offer.monetization}`);
        return seasons?.length ? { ...offer, seasons } : offer;
      });
      const anySeasonDetail = watchOffers.some((o) => o.seasons && o.seasons.length > 0);
      watchNote = anySeasonDetail
        ? "Season availability is best-effort from TMDB/JustWatch and may be incomplete."
        : "Season-by-season availability wasn’t available; showing series-level services.";
    } else if (watchOffers.length) {
      watchNote =
        "Season-by-season availability wasn’t available; showing series-level services.";
    }
  }

  const title = (mediaType === "tv" ? details.name : details.title) ?? "Untitled";
  const primaryDate = mediaType === "tv" ? details.first_air_date : details.release_date;

  return {
    id: details.id,
    mediaType,
    title,
    overview: details.overview || "No overview available.",
    posterPath: details.poster_path,
    backdropPath: details.backdrop_path,
    year: yearFromDate(primaryDate),
    tmdbScore:
      details.vote_average && details.vote_average > 0
        ? Math.round(details.vote_average * 10) / 10
        : null,
    imdbId,
    imdbScore,
    certification:
      mediaType === "tv" ? usTvCertification(details) : usMovieCertification(details),
    genres: (details.genres ?? []).map((g) => g.name),
    cast,
    directors,
    creators,
    producers,
    productionCompanies,
    runtimeMinutes:
      mediaType === "movie"
        ? details.runtime || null
        : details.episode_run_time?.[0] || null,
    status: details.status ?? null,
    numberOfSeasons: details.number_of_seasons ?? null,
    numberOfEpisodes: details.number_of_episodes ?? null,
    networks: (details.networks ?? []).map((n) => n.name),
    firstAirDate: details.first_air_date ?? null,
    lastAirDate: details.last_air_date ?? null,
    theatricalReleaseDate: releases.theatrical,
    digitalReleaseDate: releases.digital,
    releaseDate: primaryDate ?? null,
    watchOffers,
    watchNote,
    vibes: buildVibes(
      details,
      (details.genres ?? []).map((g) => ({ id: g.id, name: g.name })),
    ),
    similar,
  };
}

export function formatRuntime(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatWatchSeasons(seasons?: number[]): string | null {
  if (!seasons?.length) return null;
  return formatSeasonList(seasons);
}

export function monetizationLabel(type: WatchMonetization): string {
  switch (type) {
    case "flatrate":
      return "Subscription";
    case "free":
      return "Free";
    case "ads":
      return "Free with ads";
    case "rent":
      return "Rent";
    case "buy":
      return "Buy";
  }
}
