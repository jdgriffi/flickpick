import { DEFAULT_FILTERS, type FilterState } from "@/components/Filters";
import { MAX_PERSISTED_TITLES } from "@/lib/constants";
import type {
  CompanyFilter,
  MediaType,
  Movie,
  PersonFilter,
  VibeTag,
} from "@/lib/types";

const STORAGE_KEY = "flickpick:browse-v2";

/**
 * One fetched batch of titles plus the cursor that follows it. Keeping batches
 * discrete (rather than one flat list) means trimming for the storage quota can
 * drop whole batches and still leave `cursor` pointing at the right next page.
 */
export type BrowseBatch = {
  items: Movie[];
  /** TMDB page to request after this batch, or null at the end of results. */
  cursor: number | null;
};

export type BrowseResults = {
  batches: BrowseBatch[];
  totalResults: number;
  scoreSource: "imdb" | "tmdb";
  mediaType: MediaType;
  message?: string;
};

export type BrowseSnapshot = {
  filters: FilterState;
  results: BrowseResults | null;
  scrollY: number;
  queryKey: string;
  savedAt: number;
};

/** Identity of a browse session: the filters, without any paging cursor. */
export function buildBrowseQueryKey(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("query", filters.query.trim());
  params.set("mediaType", filters.mediaType);
  if (filters.genres.length) params.set("genre", filters.genres.join(","));
  if (filters.certifications.length) {
    params.set("certification", filters.certifications.join(","));
  }
  if (filters.decades.length) params.set("decade", filters.decades.join(","));
  if (filters.providers.length) params.set("providers", filters.providers.join(","));
  if (filters.minScore) params.set("minScore", filters.minScore);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.keyword) params.set("keyword", String(filters.keyword.id));
  if (filters.person) {
    params.set("person", String(filters.person.id));
    params.set("personName", filters.person.name);
  }
  if (filters.company) {
    params.set("company", String(filters.company.id));
    params.set("companyName", filters.company.name);
  }
  return params.toString();
}

/** Discover URL for one batch: the session key plus a page cursor. */
export function buildDiscoverUrl(
  queryKey: string,
  page: number,
  pageCount: number,
): string {
  return `/api/movies?${queryKey}&page=${page}&pageCount=${pageCount}`;
}

export function flattenBatches(batches: BrowseBatch[]): Movie[] {
  return batches.flatMap((b) => b.items);
}

export function nextCursor(batches: BrowseBatch[]): number | null {
  return batches.length ? batches[batches.length - 1].cursor : null;
}

/** Drop trailing batches until the persisted title count fits the storage budget. */
function trimBatches(batches: BrowseBatch[]): BrowseBatch[] {
  const kept: BrowseBatch[] = [];
  let total = 0;
  for (const batch of batches) {
    if (kept.length && total + batch.items.length > MAX_PERSISTED_TITLES) break;
    kept.push(batch);
    total += batch.items.length;
  }
  return kept;
}

function normalizeFilters(filters: FilterState): FilterState {
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    keyword: filters.keyword ?? null,
    person: filters.person ?? null,
    company: filters.company ?? null,
  };
}

function baseBrowseFilters(
  mediaType: MediaType,
  current: BrowseSnapshot | null,
): FilterState {
  const base = current?.filters ?? DEFAULT_FILTERS;
  const sameType = base.mediaType === mediaType;
  return {
    ...base,
    mediaType,
    query: "",
    keyword: null,
    person: null,
    company: null,
    genres: sameType ? base.genres : [],
    certifications: sameType ? base.certifications : [],
    sort: sameType ? base.sort : "popularity.desc",
  };
}

function commitBrowseFilters(filters: FilterState): void {
  saveBrowseSnapshot({
    filters,
    results: null,
    scrollY: 0,
    queryKey: buildBrowseQueryKey(filters),
  });
}

export function loadBrowseSnapshot(): BrowseSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseSnapshot;
    if (!parsed?.filters) return null;
    return {
      ...parsed,
      filters: normalizeFilters(parsed.filters),
      results: Array.isArray(parsed.results?.batches) ? parsed.results : null,
    };
  } catch {
    return null;
  }
}

export function saveBrowseSnapshot(snapshot: Omit<BrowseSnapshot, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const results = snapshot.results
      ? { ...snapshot.results, batches: trimBatches(snapshot.results.batches) }
      : null;
    const next: BrowseSnapshot = {
      ...snapshot,
      results,
      filters: normalizeFilters(snapshot.filters),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore
  }
}

/** Update only scrollY on the last snapshot (e.g. right before opening a title). */
export function touchBrowseScroll(scrollY: number): void {
  const current = loadBrowseSnapshot();
  if (!current) return;
  saveBrowseSnapshot({ ...current, scrollY });
}

/** Apply a vibe chip and jump home so discover refetches with that filter. */
export function applyVibeFilter(vibe: VibeTag, mediaType: MediaType): void {
  const current = loadBrowseSnapshot();
  const filters = baseBrowseFilters(mediaType, current);

  if (vibe.source === "genre") {
    filters.genres = [String(vibe.id)];
  } else {
    filters.keyword = { id: vibe.id, name: vibe.name };
  }

  commitBrowseFilters(filters);
}

export function applyPersonFilter(person: PersonFilter, mediaType: MediaType): void {
  const current = loadBrowseSnapshot();
  const filters = baseBrowseFilters(mediaType, current);
  filters.person = person;
  commitBrowseFilters(filters);
}

export function applyCompanyFilter(company: CompanyFilter, mediaType: MediaType): void {
  const current = loadBrowseSnapshot();
  const filters = baseBrowseFilters(mediaType, current);
  filters.company = company;
  commitBrowseFilters(filters);
}
