import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

type Props = {
  movies: Movie[];
  scoreSource: "imdb" | "tmdb";
  loading?: boolean;
  /** When false, poster clicks won't overwrite home browse scroll (detail → detail). */
  rememberBrowseScroll?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
};

export function MovieGrid({
  movies,
  scoreSource,
  loading,
  rememberBrowseScroll = true,
  emptyTitle = "No matches",
  emptyBody = "Loosen a filter or try another type, decade, genre, or score threshold.",
  className,
}: Props) {
  if (loading && movies.length === 0) {
    return (
      <div className="grid-skeleton" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    );
  }

  if (!loading && movies.length === 0) {
    return (
      <div className="empty">
        <h2>{emptyTitle}</h2>
        <p>{emptyBody}</p>
      </div>
    );
  }

  return (
    <div
      className={`movie-grid${loading ? " movie-grid--loading" : ""}${className ? ` ${className}` : ""}`}
    >
      {movies.map((movie, index) => (
        <MovieCard
          key={`${movie.mediaType}-${movie.id}`}
          movie={movie}
          index={index}
          scoreSource={scoreSource}
          rememberBrowseScroll={rememberBrowseScroll}
        />
      ))}
    </div>
  );
}
