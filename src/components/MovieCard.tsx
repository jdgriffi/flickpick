"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { touchBrowseScroll } from "@/lib/browse-session";
import { genreName, posterUrl } from "@/lib/constants";
import type { Movie } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";

function rememberScroll() {
  touchBrowseScroll(window.scrollY);
}

type Props = {
  movie: Movie;
  index: number;
  scoreSource: "imdb" | "tmdb";
  rememberBrowseScroll?: boolean;
};

export function MovieCard({
  movie,
  index,
  scoreSource,
  rememberBrowseScroll = true,
}: Props) {
  const poster = posterUrl(movie.posterPath);
  const [imgFailed, setImgFailed] = useState(false);
  const genres = movie.genreIds.slice(0, 2).map((id) => genreName(id, movie.mediaType)).join(" · ");
  const streaming = movie.providers.join(" · ");
  const href = `/title/${movie.mediaType}/${movie.id}`;
  const onNav = rememberBrowseScroll ? rememberScroll : undefined;

  return (
    <article className="movie" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <div className="movie__media">
        <Link
          href={href}
          className="movie__poster-link"
          aria-label={`${movie.title} details`}
          onClick={onNav}
        >
          <div className="movie__poster">
            {poster && !imgFailed ? (
              <Image
                src={poster}
                alt=""
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                className="movie__img"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="movie__placeholder">No poster</div>
            )}
          </div>
        </Link>
        <div className="movie__score">
          <ScoreBadge
            imdbScore={movie.imdbScore}
            tmdbScore={movie.tmdbScore}
            scoreSource={scoreSource}
            imdbId={movie.imdbId}
          />
        </div>
      </div>
      <Link href={href} className="movie__meta" onClick={onNav}>
        <h3 className="movie__title">{movie.title}</h3>
        <p className="movie__sub">
          {movie.year ?? "—"}
          {movie.certification ? ` · ${movie.certification}` : ""}
          {genres ? ` · ${genres}` : ""}
        </p>
        {streaming ? <p className="movie__stream">{streaming}</p> : null}
      </Link>
    </article>
  );
}
