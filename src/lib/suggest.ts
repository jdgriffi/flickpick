import { DEMO_MOVIES, DEMO_TV } from "./demo-data";
import { posterUrl } from "./constants";
import type { MediaType } from "./types";
import { searchPeople, type PersonSearchHit } from "./people";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

export type TitleSearchHit = {
  id: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterUrl: string | null;
};

export type SuggestResponse = {
  titles: TitleSearchHit[];
  people: PersonSearchHit[];
};

async function tmdbSearchTitles(query: string, mediaType: MediaType): Promise<TitleSearchHit[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    const pool = mediaType === "tv" ? DEMO_TV : DEMO_MOVIES;
    const lower = query.toLowerCase();
    return pool
      .filter((m) => m.title.toLowerCase().includes(lower))
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        mediaType,
        title: m.title,
        year: m.year,
        posterUrl: posterUrl(m.posterPath, "w92"),
      }));
  }

  const path = mediaType === "tv" ? "/search/tv" : "/search/movie";
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 30 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path: string | null;
    }>;
  };

  return (data.results ?? []).slice(0, 6).map((item) => {
    const date = mediaType === "tv" ? item.first_air_date : item.release_date;
    const year = date ? Number(date.slice(0, 4)) : null;
    return {
      id: item.id,
      mediaType,
      title: (mediaType === "tv" ? item.name : item.title) ?? "Untitled",
      year: Number.isFinite(year) ? year : null,
      posterUrl: posterUrl(item.poster_path, "w92"),
    };
  });
}

export async function searchSuggest(query: string, mediaType: MediaType): Promise<SuggestResponse> {
  const q = query.trim();
  if (q.length < 2) return { titles: [], people: [] };

  const [titles, people] = await Promise.all([
    tmdbSearchTitles(q, mediaType),
    searchPeople(q),
  ]);

  return { titles, people: people.slice(0, 5) };
}
