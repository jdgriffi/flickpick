import type { KeywordTag, MediaType } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CANDIDATE_LIMIT = 20;
const RESULT_LIMIT = 8;

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

const DEMO_KEYWORDS: KeywordTag[] = [
  { id: 9715, name: "superhero", resultCount: 120 },
  { id: 4565, name: "dystopia", resultCount: 80 },
  { id: 4379, name: "time travel", resultCount: 90 },
  { id: 818, name: "based on novel or book", resultCount: 200 },
  { id: 9672, name: "based on true story", resultCount: 150 },
  { id: 14544, name: "woman director", resultCount: 40 },
  { id: 180547, name: "found family", resultCount: 25 },
  { id: 10683, name: "coming of age", resultCount: 70 },
  { id: 2343, name: "remake", resultCount: 60 },
  { id: 310, name: "artificial intelligence", resultCount: 55 },
  { id: 10084, name: "space travel", resultCount: 45 },
  { id: 6054, name: "friendship", resultCount: 100 },
];

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISSING_TMDB_KEY");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/** Matches the relaxed discover gate used when a vibe keyword is active. */
async function keywordDiscoverCount(keywordId: number, mediaType: MediaType): Promise<number> {
  const path = mediaType === "tv" ? "/discover/tv" : "/discover/movie";
  const data = await tmdbFetch<{ total_results?: number }>(path, {
    language: "en-US",
    include_adult: "false",
    with_keywords: String(keywordId),
    "vote_count.gte": "1",
    page: "1",
  });
  return data.total_results ?? 0;
}

export async function searchKeywords(
  query: string,
  mediaType: MediaType = "movie",
): Promise<KeywordTag[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const apiKey = getApiKey();
  if (!apiKey) {
    const lower = q.toLowerCase();
    return DEMO_KEYWORDS.filter((k) => k.name.includes(lower)).slice(0, RESULT_LIMIT);
  }

  const data = await tmdbFetch<{ results?: Array<{ id: number; name: string }> }>(
    "/search/keyword",
    { query: q, page: "1" },
  );

  const seen = new Set<number>();
  const candidates: KeywordTag[] = [];
  for (const item of data.results ?? []) {
    const name = item.name?.trim();
    if (!name || seen.has(item.id)) continue;
    seen.add(item.id);
    candidates.push({ id: item.id, name });
    if (candidates.length >= CANDIDATE_LIMIT) break;
  }

  const checked = await Promise.all(
    candidates.map(async (kw) => {
      try {
        const resultCount = await keywordDiscoverCount(kw.id, mediaType);
        if (resultCount <= 0) return null;
        return { ...kw, resultCount };
      } catch {
        return null;
      }
    }),
  );

  return checked
    .filter((kw): kw is KeywordTag => kw != null)
    .sort((a, b) => (b.resultCount ?? 0) - (a.resultCount ?? 0))
    .slice(0, RESULT_LIMIT);
}
