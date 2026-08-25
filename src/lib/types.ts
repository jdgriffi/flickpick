export type MediaType = "movie" | "tv";

export type Movie = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  year: number | null;
  tmdbScore: number | null;
  voteCount: number;
  imdbId: string | null;
  imdbScore: number | null;
  genreIds: number[];
  certification: string | null;
  /** US flatrate streaming service short names (Netflix, Prime, …). */
  providers: string[];
};

export type MovieFilters = {
  mediaType?: string;
  genre?: string;
  certification?: string;
  decade?: string;
  providers?: string;
  minScore?: string;
  sort?: string;
  page?: string;
  query?: string;
  /** TMDB keyword id for vibe filtering. */
  keyword?: string;
  /** TMDB person id (cast/crew). */
  person?: string;
  personName?: string;
  /** TMDB production company id. */
  company?: string;
  companyName?: string;
};

export type KeywordTag = {
  id: number;
  name: string;
  /** Optional discover hit count for the active media type. */
  resultCount?: number;
};

/** Detail-page vibe chip — TMDB keyword, or genre when keywords are sparse. */
export type VibeTag = {
  id: number;
  name: string;
  source: "keyword" | "genre";
};

export type PersonFilter = {
  id: number;
  name: string;
};

export type CompanyFilter = {
  id: number;
  name: string;
};

export type DiscoverResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: Movie[];
  scoreSource: "imdb" | "tmdb";
  mediaType: MediaType;
  demo?: boolean;
  message?: string;
};

export type Genre = {
  id: number;
  name: string;
};

export type StreamingProvider = {
  id: number;
  name: string;
  shortName: string;
};

export type CreditPerson = {
  id: number;
  name: string;
  role: string;
  profilePath: string | null;
};

export type WatchMonetization = "flatrate" | "free" | "ads" | "rent" | "buy";

export type WatchOffer = {
  providerId: number;
  name: string;
  monetization: WatchMonetization;
  /** TMDB provider logo path (e.g. `/abc.jpg`), if available. */
  logoPath: string | null;
  /** Best-effort season numbers when TMDB has per-season provider data. */
  seasons?: number[];
};

export type TitleDetail = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: number | null;
  tmdbScore: number | null;
  imdbId: string | null;
  imdbScore: number | null;
  certification: string | null;
  genres: string[];
  cast: CreditPerson[];
  directors: CreditPerson[];
  creators: CreditPerson[];
  producers: CreditPerson[];
  productionCompanies: CompanyFilter[];
  runtimeMinutes: number | null;
  status: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  networks: string[];
  firstAirDate: string | null;
  lastAirDate: string | null;
  theatricalReleaseDate: string | null;
  digitalReleaseDate: string | null;
  releaseDate: string | null;
  watchOffers: WatchOffer[];
  watchNote: string | null;
  /** Vibes: TMDB keywords, topped up with genres when sparse. */
  vibes: VibeTag[];
  /** TMDB recommendations (falls back to similar). */
  similar: Movie[];
  demo?: boolean;
};
