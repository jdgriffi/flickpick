export type Movie = {
  id: number;
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
};

export type MovieFilters = {
  genre?: string;
  certification?: string;
  decade?: string;
  providers?: string;
  minScore?: string;
  sort?: string;
  page?: string;
  query?: string;
};

export type DiscoverResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: Movie[];
  scoreSource: "imdb" | "tmdb";
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
