import { DEFAULT_FILTERS, type FilterState } from "@/components/Filters";
import type {
  CompanyFilter,
  DiscoverResponse,
  MediaType,
  PersonFilter,
  VibeTag,
} from "@/lib/types";

const STORAGE_KEY = "flickpick:browse-v1";

export type BrowseSnapshot = {
  filters: FilterState;
  page: number;
  data: DiscoverResponse | null;
  scrollY: number;
  queryKey: string;
  savedAt: number;
};

export function buildBrowseQueryKey(filters: FilterState, page: number): string {
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
  params.set("page", String(page));
  return params.toString();
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
    page: 1,
    data: null,
    scrollY: 0,
    queryKey: buildBrowseQueryKey(filters, 1),
  });
}

export function loadBrowseSnapshot(): BrowseSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseSnapshot;
    if (!parsed?.filters || typeof parsed.page !== "number") return null;
    return {
      ...parsed,
      filters: normalizeFilters(parsed.filters),
    };
  } catch {
    return null;
  }
}

export function saveBrowseSnapshot(snapshot: Omit<BrowseSnapshot, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const next: BrowseSnapshot = {
      ...snapshot,
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
