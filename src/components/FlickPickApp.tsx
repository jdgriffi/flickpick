"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  buildBrowseQueryKey,
  loadBrowseSnapshot,
  saveBrowseSnapshot,
} from "@/lib/browse-session";
import type { DiscoverResponse } from "@/lib/types";
import { DEFAULT_FILTERS, Filters, type FilterState } from "./Filters";
import { MovieGrid } from "./MovieGrid";
import { SiteFooter } from "./SiteFooter";

export function FlickPickApp() {
  const [sessionReady, setSessionReady] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const scrollRestoreRef = useRef<number | null>(null);
  const didRestoreScrollRef = useRef(false);
  const cachedQueryKeyRef = useRef<string | null>(null);
  const stateRef = useRef({ filters: DEFAULT_FILTERS, page: 1, data: null as DiscoverResponse | null });

  useEffect(() => {
    const snap = loadBrowseSnapshot();
    if (snap) {
      setFilters(snap.filters);
      setPage(snap.page);
      if (snap.data) {
        setData(snap.data);
        cachedQueryKeyRef.current = snap.queryKey;
        setLoading(false);
      }
      scrollRestoreRef.current = snap.scrollY;
    }
    setSessionReady(true);
  }, []);

  useEffect(() => {
    stateRef.current = { filters, page, data };
  }, [filters, page, data]);

  useEffect(() => {
    if (!sessionReady) return;

    const controller = new AbortController();
    const queryKey = buildBrowseQueryKey(filters, page);
    const hasCache = cachedQueryKeyRef.current === queryKey && data != null;
    const timer = setTimeout(() => {
      if (!hasCache) setLoading(true);
      setError(null);

      fetch(`/api/movies?${queryKey}`, { signal: controller.signal })
        .then(async (res) => {
          const json = (await res.json()) as DiscoverResponse & { error?: string };
          if (!res.ok) throw new Error(json.error || "Request failed");
          cachedQueryKeyRef.current = queryKey;
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
    // data used only for cache gate on session restore; omit from deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    saveBrowseSnapshot({
      filters,
      page,
      data,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      queryKey: buildBrowseQueryKey(filters, page),
    });
  }, [filters, page, data, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const persistScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const { filters: f, page: p, data: d } = stateRef.current;
        saveBrowseSnapshot({
          filters: f,
          page: p,
          data: d,
          scrollY: window.scrollY,
          queryKey: buildBrowseQueryKey(f, p),
        });
      }, 120);
    };

    const persistNow = () => {
      const { filters: f, page: p, data: d } = stateRef.current;
      saveBrowseSnapshot({
        filters: f,
        page: p,
        data: d,
        scrollY: window.scrollY,
        queryKey: buildBrowseQueryKey(f, p),
      });
    };

    window.addEventListener("pagehide", persistNow);
    window.addEventListener("scroll", persistScroll, { passive: true });
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener("pagehide", persistNow);
      window.removeEventListener("scroll", persistScroll);
    };
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady || loading || didRestoreScrollRef.current) return;
    const y = scrollRestoreRef.current;
    if (y == null || y <= 0) {
      didRestoreScrollRef.current = true;
      return;
    }
    didRestoreScrollRef.current = true;
    scrollRestoreRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  }, [sessionReady, loading, data]);

  function handleFilterChange(next: FilterState) {
    didRestoreScrollRef.current = true;
    scrollRestoreRef.current = null;
    setPage(1);
    setFilters(next);
  }

  function handleReset() {
    didRestoreScrollRef.current = true;
    scrollRestoreRef.current = null;
    setPage(1);
    setFilters(DEFAULT_FILTERS);
  }

  const busy = loading || isPending;

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__glow" aria-hidden />
        <div className="hero__inner">
          <p className="hero__kicker">Movie & TV finder</p>
          <h1 className="brand">FlickPick</h1>
          <p className="hero__tagline">
            Filter movies or TV by genre, rating, decade, and where it streams — then sort by score.
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

      <SiteFooter imdbViaOmdb={data?.scoreSource === "imdb"} />
    </div>
  );
}
