import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

type Props = {
  movies: Movie[];
  scoreSource: "imdb" | "tmdb";
  loading?: boolean;
};

export function MovieGrid({ movies, scoreSource, loading }: Props) {
  if (loading && movies.length === 0) {
    return (
      <div className="grid-skeleton" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    );
  }

  if (!loading && movies.length === 0) {
    return (
      <div className="empty">
        <h2>No matches</h2>
        <p>Loosen a filter or try another decade, genre, or score threshold.</p>
      </div>
    );
  }

  return (
    <div className={`movie-grid${loading ? " movie-grid--loading" : ""}`}>
      {movies.map((movie, index) => (
        <MovieCard key={movie.id} movie={movie} index={index} scoreSource={scoreSource} />
      ))}
    </div>
  );
}
