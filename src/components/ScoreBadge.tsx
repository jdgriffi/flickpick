type Props = {
  imdbScore: number | null;
  tmdbScore: number | null;
  scoreSource: "imdb" | "tmdb";
  imdbId?: string | null;
};

export function ScoreBadge({ imdbScore, tmdbScore, scoreSource, imdbId }: Props) {
  const score = scoreSource === "imdb" ? imdbScore ?? tmdbScore : tmdbScore ?? imdbScore;
  const label = scoreSource === "imdb" && imdbScore != null ? "IMDb" : "TMDB";

  if (score == null) {
    return <span className="score-badge score-badge--empty">—</span>;
  }

  const tone = score >= 8 ? "high" : score >= 6.5 ? "mid" : "low";
  const content = (
    <>
      <span className="score-badge__label">{label}</span>
      <span className="score-badge__value">{score.toFixed(1)}</span>
    </>
  );

  if (imdbId) {
    return (
      <a
        className={`score-badge score-badge--${tone}`}
        href={`https://www.imdb.com/title/${imdbId}/`}
        target="_blank"
        rel="noopener noreferrer"
        title="Open on IMDb"
      >
        {content}
      </a>
    );
  }

  return <span className={`score-badge score-badge--${tone}`}>{content}</span>;
}
