"use client";

import { useEffect, useState, useTransition } from "react";
import { DEFAULT_FILTERS, Filters, type FilterState } from "./Filters";
import { MovieGrid } from "./MovieGrid";
import type { DiscoverResponse } from "@/lib/types";

function buildQuery(filters: FilterState, page: number): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.certification) params.set("certification", filters.certification);
  if (filters.decade) params.set("decade", filters.decade);
  if (filters.providers.length) params.set("providers", filters.providers.join(","));
  if (filters.minScore) params.set("minScore", filters.minScore);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return params.toString();
}

export function FlickPickApp() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      fetch(`/api/movies?${buildQuery(filters, page)}`, { signal: controller.signal })
        .then(async (res) => {
          const json = (await res.json()) as DiscoverResponse & { error?: string };
          if (!res.ok) throw new Error(json.error || "Request failed");
          startTransition(() => {
            setData(json);
          });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Something went wrong");
        })
        .finally(() => setLoading(false));
    }, filters.query ? 300 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, page]);

  function handleFilterChange(next: FilterState) {
    setPage(1);
    setFilters(next);
  }

  function handleReset() {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
  }

  const busy = loading || isPending;

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__glow" aria-hidden />
        <div className="hero__inner">
          <p className="hero__kicker">Movie finder</p>
          <h1 className="brand">FlickPick</h1>
          <p className="hero__tagline">
            Filter by genre, MPAA rating, decade, and where it streams — then sort by score.
          </p>
        </div>
      </header>

      <main className="main">
        <Filters
          value={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          resultCount={data?.totalResults}
          loading={busy}
        />

        {data?.message && <p className="banner">{data.message}</p>}
        {error && <p className="banner banner--error">{error}</p>}

        <MovieGrid
          movies={data?.results ?? []}
          scoreSource={data?.scoreSource ?? "tmdb"}
          loading={busy}
        />

        {data && data.totalPages > 1 && (
          <div className="pager">
            <button
              type="button"
              className="btn"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page >= data.totalPages || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Powered by{" "}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
            TMDB
          </a>
          {data?.scoreSource === "imdb" ? " · IMDb scores via OMDb" : ""}
        </p>
      </footer>
    </div>
  );
}
