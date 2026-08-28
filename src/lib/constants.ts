import type { Genre, MediaType, StreamingProvider } from "./types";

export const MEDIA_TYPES: Array<{ value: MediaType; label: string }> = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV shows" },
];

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
];

/** @deprecated use MOVIE_GENRES — kept for any lingering imports */
export const GENRES = MOVIE_GENRES;

export const MPAA_RATINGS = ["G", "PG", "PG-13", "R", "NC-17", "NR"] as const;

/** TMDB US movie certification scale order (contiguous gte/lte). */
export const MPAA_SCALE = ["NR", "G", "PG", "PG-13", "R", "NC-17"] as const;

export const TV_RATINGS = ["TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"] as const;

/** TMDB US TV certification scale order. */
export const TV_SCALE = ["TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"] as const;

export const DECADES = [
  { value: "2020", label: "2020s" },
  { value: "2010", label: "2010s" },
  { value: "2000", label: "2000s" },
  { value: "1990", label: "1990s" },
  { value: "1980", label: "1980s" },
  { value: "1970", label: "1970s" },
  { value: "1960", label: "1960s" },
  { value: "1950", label: "1950s" },
  { value: "1940", label: "1940s" },
  { value: "1930", label: "1930s" },
  { value: "pre1930", label: "1920s & earlier" },
] as const;

/** Inclusive calendar years for a decade filter value (incl. pre1930 bucket). */
export function decadeYearRange(value: string): { start: number; end: number } | null {
  if (value === "pre1930") return { start: 1888, end: 1929 };
  const start = Number(value);
  if (!Number.isFinite(start)) return null;
  return { start, end: start + 9 };
}

/** Common US streaming providers (TMDB watch provider IDs). */
export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: 8, name: "Netflix", shortName: "Netflix" },
  { id: 9, name: "Amazon Prime Video", shortName: "Prime" },
  { id: 337, name: "Disney Plus", shortName: "Disney+" },
  { id: 1899, name: "HBO Max", shortName: "HBO Max" },
  { id: 15, name: "Hulu", shortName: "Hulu" },
  { id: 350, name: "Apple TV Plus", shortName: "Apple TV+" },
  { id: 531, name: "Paramount Plus", shortName: "Paramount+" },
  { id: 386, name: "Peacock", shortName: "Peacock" },
  { id: 151, name: "BritBox", shortName: "BritBox" },
  { id: 43, name: "Starz", shortName: "Starz" },
  { id: 526, name: "AMC+", shortName: "AMC+" },
  { id: 34, name: "MGM Plus", shortName: "MGM+" },
  { id: 258, name: "Criterion Channel", shortName: "Criterion" },
  { id: 283, name: "Crunchyroll", shortName: "Crunchyroll" },
  { id: 290, name: "Hallmark+", shortName: "Hallmark+" },
];

/** Sentinel value in the streaming multi-select for free / ad-supported discover. */
export const FREE_STREAMING_VALUE = "free";

/** Major US free / ad-supported services used when Free Streaming is selected. */
export const FREE_STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: 73, name: "Tubi", shortName: "Tubi" },
  { id: 300, name: "Pluto TV", shortName: "Pluto" },
  { id: 613, name: "Amazon Freevee", shortName: "Freevee" },
  { id: 207, name: "The Roku Channel", shortName: "Roku" },
  { id: 538, name: "Plex", shortName: "Plex" },
  { id: 12, name: "Crackle", shortName: "Crackle" },
];

/** Extra TMDB ids that should display as our main brands (channels / tiers / rebrands). */
const PROVIDER_ID_ALIASES: Record<number, string> = {
  1899: "HBO Max",
  1825: "HBO Max", // HBO Max Amazon Channel
  384: "HBO Max", // legacy HBO Max id in some regions
  9: "Prime",
  119: "Prime", // Amazon Prime Video (some regions)
  2100: "Prime", // Amazon Prime Video with Ads
  8: "Netflix",
  1796: "Netflix", // Netflix basic / Standard with Ads
  531: "Paramount+",
  2303: "Paramount+", // Paramount Plus Premium
  2304: "Paramount+", // Paramount Plus Basic with Ads
  582: "Paramount+", // Paramount+ Amazon Channel
  1853: "Paramount+", // Paramount Plus Apple TV Channel
  1770: "Paramount+", // Paramount+ with Showtime
  386: "Peacock",
  387: "Peacock", // Peacock Premium / Premium Plus
  151: "BritBox",
  197: "BritBox", // BritBox Amazon Channel
  1852: "BritBox", // BritBox Apple TV Channel
  43: "Starz",
  1794: "Starz", // Starz Amazon Channel
  1855: "Starz", // Starz Apple TV Channel
  634: "Starz", // Starz Roku Premium Channel
  194: "Starz", // Starz Play Amazon Channel
  526: "AMC+",
  1854: "AMC+", // AMC Plus Apple TV Channel
  34: "MGM+",
  583: "MGM+", // MGM Plus Amazon Channel
  636: "MGM+", // MGM Plus Roku Premium Channel
  258: "Criterion",
  283: "Crunchyroll",
  1968: "Crunchyroll", // Crunchyroll Amazon Channel
  290: "Hallmark+", // Hallmark+ / Movies Now Amazon Channel
  1746: "Hallmark+", // Hallmark TV Amazon Channel
  2058: "Hallmark+", // Hallmark Movies Now Apple TV Channel
  73: "Tubi",
  300: "Pluto",
  613: "Freevee",
  207: "Roku",
  538: "Plex",
  12: "Crackle",
};

const ALL_NAMED_PROVIDERS = [...STREAMING_PROVIDERS, ...FREE_STREAMING_PROVIDERS];

const PROVIDER_SHORT = new Map(ALL_NAMED_PROVIDERS.map((p) => [p.id, p.shortName]));

const CHANNEL_SUFFIX =
  /\s+(Amazon Channel|Apple TV Channel|Roku Premium Channel|Play Amazon Channel)$/i;
const ADS_TIER_SUFFIX = /\s+with Ads$/i;

function matchKnownBrand(name: string): string | null {
  const cleaned = name.replace(ADS_TIER_SUFFIX, "").trim();
  const compact = cleaned.replace(/[\s+]+/g, "").toLowerCase();
  for (const p of ALL_NAMED_PROVIDERS) {
    if (
      cleaned.toLowerCase() === p.shortName.toLowerCase() ||
      cleaned.toLowerCase() === p.name.toLowerCase() ||
      compact === p.shortName.replace(/[\s+]+/g, "").toLowerCase() ||
      compact === p.name.replace(/[\s+]+/g, "").toLowerCase()
    ) {
      return p.shortName;
    }
  }
  if (/^(hbo\s*)?max$/i.test(cleaned)) return "HBO Max";
  if (/^(amazon\s+)?prime(\s+video)?$/i.test(cleaned)) return "Prime";
  if (/^netflix(\s+(basic|standard))?(\s+with\s+ads)?$/i.test(cleaned)) return "Netflix";
  if (/^paramount(\+|(\s*plus)?)/i.test(cleaned)) return "Paramount+";
  if (/^peacock/i.test(cleaned)) return "Peacock";
  if (/^mgm(\+|(\s*plus)?)/i.test(cleaned)) return "MGM+";
  if (/^starz(play)?$/i.test(cleaned)) return "Starz";
  if (/^hallmark(\+|\s+plus)?$/i.test(cleaned)) return "Hallmark+";
  if (/^hallmark\s+movies(\s+now)?$/i.test(cleaned)) return "Hallmark+";
  if (/^(amazon\s+)?freevee$/i.test(cleaned)) return "Freevee";
  if (/^pluto(\s+tv)?$/i.test(cleaned)) return "Pluto";
  if (/^(the\s+)?roku(\s+channel)?$/i.test(cleaned)) return "Roku";
  return null;
}

/** Display label for a TMDB provider — collapses channel add-ons / ad tiers into the main brand. */
export function providerShortName(id: number, fallback?: string): string {
  const fromId = PROVIDER_SHORT.get(id) ?? PROVIDER_ID_ALIASES[id];
  if (fromId) return fromId;

  const raw = (fallback ?? "Streaming").trim();
  const withoutChannel = raw.replace(CHANNEL_SUFFIX, "").replace(ADS_TIER_SUFFIX, "").trim();
  return matchKnownBrand(withoutChannel) ?? matchKnownBrand(raw) ?? withoutChannel;
}

export function isKnownStreamingBrand(label: string): boolean {
  return ALL_NAMED_PROVIDERS.some((p) => p.shortName === label);
}

/** Expand a selected provider id to include tier/channel aliases that share its brand label. */
export function expandWatchProviderIds(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    const num = Number(id);
    const label = PROVIDER_SHORT.get(num) ?? PROVIDER_ID_ALIASES[num];
    if (!label) continue;
    for (const p of ALL_NAMED_PROVIDERS) {
      if (p.shortName === label) out.add(String(p.id));
    }
    for (const [aliasId, aliasLabel] of Object.entries(PROVIDER_ID_ALIASES)) {
      if (aliasLabel === label) out.add(aliasId);
    }
  }
  return [...out];
}

export function knownStreamingProviderIds(): number[] {
  return [
    ...ALL_NAMED_PROVIDERS.map((p) => p.id),
    ...Object.keys(PROVIDER_ID_ALIASES).map(Number),
  ];
}

export const MOVIE_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "imdb.desc", label: "IMDb score ↑" },
  { value: "imdb.asc", label: "IMDb score ↓" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "primary_release_date.asc", label: "Oldest" },
  { value: "title.asc", label: "Title A–Z" },
] as const;

export const TV_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "imdb.desc", label: "IMDb score ↑" },
  { value: "imdb.asc", label: "IMDb score ↓" },
  { value: "first_air_date.desc", label: "Newest" },
  { value: "first_air_date.asc", label: "Oldest" },
  { value: "name.asc", label: "Title A–Z" },
] as const;

/** @deprecated use MOVIE_SORT_OPTIONS */
export const SORT_OPTIONS = MOVIE_SORT_OPTIONS;

export const MIN_SCORE_OPTIONS = [
  { value: "", label: "Any score" },
  { value: "5", label: "5.0+" },
  { value: "6", label: "6.0+" },
  { value: "7", label: "7.0+" },
  { value: "8", label: "8.0+" },
  { value: "8.5", label: "8.5+" },
] as const;

/** TMDB discover/search page size (fixed by the API). */
export const TMDB_PAGE_SIZE = 20;

/** Browse grid page size — two TMDB pages merged per UI page. */
export const RESULTS_PER_PAGE = 40;

export const POSTER_SIZE = "w342";
export const BACKDROP_SIZE = "w1280";
export const PROFILE_SIZE = "w185";
export const PROVIDER_LOGO_SIZE = "w45";
export const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size = POSTER_SIZE): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size = BACKDROP_SIZE): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function profileUrl(path: string | null, size = PROFILE_SIZE): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function providerLogoUrl(path: string | null, size = PROVIDER_LOGO_SIZE): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function genresFor(mediaType: MediaType): Genre[] {
  return mediaType === "tv" ? TV_GENRES : MOVIE_GENRES;
}

export function ratingsFor(mediaType: MediaType): readonly string[] {
  return mediaType === "tv" ? TV_RATINGS : MPAA_RATINGS;
}

export function ratingScaleFor(mediaType: MediaType): readonly string[] {
  return mediaType === "tv" ? TV_SCALE : MPAA_SCALE;
}

export function sortOptionsFor(mediaType: MediaType) {
  return mediaType === "tv" ? TV_SORT_OPTIONS : MOVIE_SORT_OPTIONS;
}

export function genreName(id: number, mediaType: MediaType = "movie"): string {
  return genresFor(mediaType).find((g) => g.id === id)?.name ?? "Other";
}
