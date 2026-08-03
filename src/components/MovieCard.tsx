import Image from "next/image";
import { genreName, posterUrl } from "@/lib/constants";
import type { Movie } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";

type Props = {
  movie: Movie;
  index: number;
  scoreSource: "imdb" | "tmdb";
};

export function MovieCard({ movie, index, scoreSource }: Props) {
  const poster = posterUrl(movie.posterPath);
  const genres = movie.genreIds.slice(0, 2).map(genreName).join(" · ");

  return (
    <article className="movie" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <div className="movie__poster">
        {poster ? (
          <Image
            src={poster}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="movie__img"
          />
        ) : (
          <div className="movie__placeholder">No poster</div>
        )}
        <div className="movie__score">
          <ScoreBadge
            imdbScore={movie.imdbScore}
            tmdbScore={movie.tmdbScore}
            scoreSource={scoreSource}
            imdbId={movie.imdbId}
          />
        </div>
      </div>
      <div className="movie__meta">
        <h3 className="movie__title">{movie.title}</h3>
        <p className="movie__sub">
          {movie.year ?? "—"}
          {movie.certification ? ` · ${movie.certification}` : ""}
          {genres ? ` · ${genres}` : ""}
        </p>
      </div>
    </article>
  );
}
