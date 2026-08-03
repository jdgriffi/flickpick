import type { Genre, StreamingProvider } from "./types";

export const GENRES: Genre[] = [
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

export const MPAA_RATINGS = ["G", "PG", "PG-13", "R", "NC-17", "NR"] as const;

export const DECADES = [
  { value: "2020", label: "2020s" },
  { value: "2010", label: "2010s" },
  { value: "2000", label: "2000s" },
  { value: "1990", label: "1990s" },
  { value: "1980", label: "1980s" },
  { value: "1970", label: "1970s" },
  { value: "1960", label: "1960s" },
] as const;

/** Common US streaming providers (TMDB watch provider IDs). */
export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: 8, name: "Netflix", shortName: "Netflix" },
  { id: 9, name: "Amazon Prime Video", shortName: "Prime" },
  { id: 337, name: "Disney Plus", shortName: "Disney+" },
  { id: 1899, name: "Max", shortName: "Max" },
  { id: 15, name: "Hulu", shortName: "Hulu" },
  { id: 350, name: "Apple TV Plus", shortName: "Apple TV+" },
  { id: 531, name: "Paramount Plus", shortName: "Paramount+" },
  { id: 386, name: "Peacock", shortName: "Peacock" },
];

export const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "imdb.desc", label: "IMDb score ↑" },
  { value: "imdb.asc", label: "IMDb score ↓" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "primary_release_date.asc", label: "Oldest" },
  { value: "title.asc", label: "Title A–Z" },
] as const;

export const MIN_SCORE_OPTIONS = [
  { value: "", label: "Any score" },
  { value: "5", label: "5.0+" },
  { value: "6", label: "6.0+" },
  { value: "7", label: "7.0+" },
  { value: "8", label: "8.0+" },
  { value: "8.5", label: "8.5+" },
] as const;

export const POSTER_SIZE = "w342";
export const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size = POSTER_SIZE): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function genreName(id: number): string {
  return GENRES.find((g) => g.id === id)?.name ?? "Other";
}
