"use client";

import {
  DECADES,
  GENRES,
  MIN_SCORE_OPTIONS,
  MPAA_RATINGS,
  SORT_OPTIONS,
  STREAMING_PROVIDERS,
} from "@/lib/constants";

export type FilterState = {
  query: string;
  genre: string;
  certification: string;
  decade: string;
  providers: string[];
  minScore: string;
  sort: string;
};

type Props = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  resultCount?: number;
  loading?: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  genre: "",
  certification: "",
  decade: "",
  providers: [],
  minScore: "",
  sort: "popularity.desc",
};

export function Filters({ value, onChange, onReset, resultCount, loading }: Props) {
  function set<K extends keyof FilterState>(key: K, next: FilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  function toggleProvider(id: number) {
    const idStr = String(id);
    const providers = value.providers.includes(idStr)
      ? value.providers.filter((p) => p !== idStr)
      : [...value.providers, idStr];
    onChange({ ...value, providers });
  }

  return (
    <section className="filters" aria-label="Movie filters">
      <div className="filters__search">
        <label className="sr-only" htmlFor="movie-search">
          Search titles
        </label>
        <input
          id="movie-search"
          type="search"
          placeholder="Search titles…"
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
        />
      </div>

      <div className="filters__grid">
        <label>
          <span>Genre</span>
          <select value={value.genre} onChange={(e) => set("genre", e.target.value)}>
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>MPAA</span>
          <select
            value={value.certification}
            onChange={(e) => set("certification", e.target.value)}
          >
            <option value="">Any rating</option>
            {MPAA_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Decade</span>
          <select value={value.decade} onChange={(e) => set("decade", e.target.value)}>
            <option value="">Any decade</option>
            {DECADES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Min score</span>
          <select value={value.minScore} onChange={(e) => set("minScore", e.target.value)}>
            {MIN_SCORE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={value.sort} onChange={(e) => set("sort", e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filters__providers">
        <span className="filters__providers-label">Streaming</span>
        <div className="filters__chips" role="group" aria-label="Streaming services">
          {STREAMING_PROVIDERS.map((p) => {
            const active = value.providers.includes(String(p.id));
            return (
              <button
                key={p.id}
                type="button"
                className={active ? "chip chip--active" : "chip"}
                aria-pressed={active}
                onClick={() => toggleProvider(p.id)}
              >
                {p.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filters__footer">
        <p className="filters__count">
          {loading ? "Finding movies…" : `${resultCount?.toLocaleString() ?? "—"} matches`}
        </p>
        <button type="button" className="btn-ghost" onClick={onReset}>
          Reset filters
        </button>
      </div>
    </section>
  );
}
