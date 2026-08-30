"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BrowseResults,
  buildBrowseQueryKey,
  buildDiscoverUrl,
  flattenBatches,
  loadBrowseSnapshot,
  nextCursor,
  saveBrowseSnapshot,
} from "@/lib/browse-session";
import {
  INITIAL_PAGE_COUNT,
  LOAD_MORE_PAGE_COUNT,
  MAX_EMPTY_BATCH_STREAK,
  SCROLL_TRIGGER_REMAINING,
} from "@/lib/constants";
import type { DiscoverResponse, Movie } from "@/lib/types";
import { DEFAULT_FILTERS, Filters, type FilterState } from "./Filters";
import { MovieGrid } from "./MovieGrid";
import { SiteFooter } from "./SiteFooter";

type DiscoverPayload = DiscoverResponse & { error?: string };

const movieKey = (m: Movie) => `${m.mediaType}-${m.id}`;

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";

export function FlickPickApp() {
  const [sessionReady, setSessionReady] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [results, setResults] = useState<BrowseResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);

  const queryKey = useMemo(() => buildBrowseQueryKey(filters), [filters]);
  const items = useMemo(
    () => (results ? flattenBatches(results.batches) : []),
    [results],
  );
  const cursor = results ? nextCursor(results.batches) : null;
  const atEnd = results != null && cursor == null;

  const scrollRestoreRef = useRef<number | null>(null);
  const didRestoreScrollRef = useRef(false);
  const cachedQueryKeyRef = useRef<string | null>(null);
  const queryKeyRef = useRef(queryKey);
  const resultsRef = useRef<BrowseResults | null>(null);
  const filtersRef = useRef<FilterState>(DEFAULT_FILTERS);
  const moreAbortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const emptyStreakRef = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    queryKeyRef.current = queryKey;
    resultsRef.current = results;
    filtersRef.current = filters;
  }, [queryKey, results, filters]);

  useEffect(() => {
    const snap = loadBrowseSnapshot();
    if (snap) {
      setFilters(snap.filters);
      if (snap.results) {
        setResults(snap.results);
        cachedQueryKeyRef.current = snap.queryKey;
        setInitialLoading(false);
      }
      scrollRestoreRef.current = snap.scrollY;
    }
    setSessionReady(true);
  }, []);

  /** First batch for a filter set: two TMDB pages so the grid opens with 40 titles. */
  useEffect(() => {
    if (!sessionReady) return;
    if (cachedQueryKeyRef.current === queryKey && resultsRef.current) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      moreAbortRef.current?.abort();
      loadingMoreRef.current = false;
      emptyStreakRef.current = 0;
      setLoadingMore(false);
      setAutoPaused(false);
      setInitialLoading(true);
      setError(null);

      fetch(buildDiscoverUrl(queryKey, 1, INITIAL_PAGE_COUNT), { signal: controller.signal })
        .then(async (res) => {
          const json = (await res.json()) as DiscoverPayload;
          if (!res.ok) throw new Error(json.error || "Request failed");
          cachedQueryKeyRef.current = queryKey;
          setResults({
            batches: [{ items: json.results, cursor: json.nextPage }],
            totalResults: json.totalResults,
            scoreSource: json.scoreSource,
            mediaType: json.mediaType,
            message: json.message,
          });
        })
        .catch((err: unknown) => {
          if (isAbort(err)) return;
          setError(errorMessage(err));
        })
        .finally(() => setInitialLoading(false));
    }, filters.query.trim() ? 300 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // resultsRef is only a cache gate for session restore; including it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, sessionReady]);

  /** Append the next TMDB page. Single-flight; stale responses are dropped. */
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return;

    const prev = resultsRef.current;
    const key = queryKeyRef.current;
    const from = prev ? nextCursor(prev.batches) : null;
    if (!prev || from == null) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const controller = new AbortController();
    moreAbortRef.current = controller;

    fetch(buildDiscoverUrl(key, from, LOAD_MORE_PAGE_COUNT), { signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json()) as DiscoverPayload;
        if (!res.ok) throw new Error(json.error || "Request failed");
        if (queryKeyRef.current !== key) return;

        const base = resultsRef.current ?? prev;
        const seen = new Set(flattenBatches(base.batches).map(movieKey));
        const fresh = json.results.filter((m) => !seen.has(movieKey(m)));

        // A batch can come back empty when client-side filtering rejects the whole
        // page. Chasing that forever would scroll-loop, so give up after a streak.
        emptyStreakRef.current = fresh.length ? 0 : emptyStreakRef.current + 1;
        if (emptyStreakRef.current >= MAX_EMPTY_BATCH_STREAK) setAutoPaused(true);

        setError(null);
        setResults({
          ...base,
          batches: [...base.batches, { items: fresh, cursor: json.nextPage }],
        });
      })
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        setError(errorMessage(err));
        setAutoPaused(true);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  /**
   * Watch the card `SCROLL_TRIGGER_REMAINING` from the end — once it's on screen
   * there are 20 or fewer titles left below, so pull the next page.
   */
  useEffect(() => {
    if (!sessionReady || initialLoading || autoPaused || cursor == null) return;
    const node = triggerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sessionReady, initialLoading, autoPaused, cursor, items.length]);

  /**
   * With no cards there's nothing for the observer to watch, so keep pulling
   * directly. Happens when client-side filtering rejects an entire batch.
   */
  useEffect(() => {
    if (!sessionReady || initialLoading || autoPaused || loadingMore) return;
    if (items.length > 0 || cursor == null) return;
    loadMoreRef.current();
  }, [sessionReady, initialLoading, autoPaused, loadingMore, items.length, cursor]);

  useEffect(() => {
    if (!sessionReady) return;
    saveBrowseSnapshot({
      filters,
      results,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      queryKey,
    });
  }, [filters, results, queryKey, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const persistNow = () => {
      saveBrowseSnapshot({
        filters: filtersRef.current,
        results: resultsRef.current,
        scrollY: window.scrollY,
        queryKey: queryKeyRef.current,
      });
    };

    const persistScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(persistNow, 120);
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
    if (!sessionReady || initialLoading || didRestoreScrollRef.current) return;
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
  }, [sessionReady, initialLoading, results]);

  function startNewSession(next: FilterState) {
    didRestoreScrollRef.current = true;
    scrollRestoreRef.current = null;
    setFilters(next);
    window.scrollTo(0, 0);
  }

  function handleResumeAutoLoad() {
    emptyStreakRef.current = 0;
    setAutoPaused(false);
    setError(null);
    loadMore();
  }

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
          onChange={startNewSession}
          onReset={() => startNewSession(DEFAULT_FILTERS)}
          resultCount={results?.totalResults}
          loading={initialLoading}
        />

        {results?.message && <p className="banner">{results.message}</p>}
        {error && <p className="banner banner--error">{error}</p>}

        <MovieGrid
          movies={items}
          scoreSource={results?.scoreSource ?? "tmdb"}
          loading={initialLoading}
          triggerIndex={Math.max(0, items.length - SCROLL_TRIGGER_REMAINING)}
          triggerRef={triggerRef}
        />

        {loadingMore && (
          <p className="feed-status" role="status">
            Loading more…
          </p>
        )}

        {autoPaused && cursor != null && !loadingMore && (
          <div className="feed-status">
            <button type="button" className="btn" onClick={handleResumeAutoLoad}>
              Load more
            </button>
          </div>
        )}

        {atEnd && items.length > 0 && !initialLoading && (
          <p className="feed-status feed-status--end">That&rsquo;s everything.</p>
        )}
      </main>

      {atEnd && <SiteFooter imdbViaOmdb={results?.scoreSource === "imdb"} />}
    </div>
  );
}
