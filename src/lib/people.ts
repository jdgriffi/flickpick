import type { PersonFilter } from "./types";
import { profileUrl } from "./constants";

const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
}

export type PersonSearchHit = PersonFilter & {
  knownFor?: string;
  profilePath?: string | null;
  profileUrl?: string | null;
};

const DEMO_PEOPLE: PersonSearchHit[] = [
  { id: 19292, name: "Adam Sandler", knownFor: "Acting" },
  { id: 287, name: "Brad Pitt", knownFor: "Acting" },
  { id: 1245, name: "Scarlett Johansson", knownFor: "Acting" },
  { id: 1892, name: "Matt Damon", knownFor: "Acting" },
  { id: 5081, name: "Emily Blunt", knownFor: "Acting" },
];

export async function searchPeople(query: string): Promise<PersonSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const apiKey = getApiKey();
  if (!apiKey) {
    const lower = q.toLowerCase();
    return DEMO_PEOPLE.filter((p) => p.name.toLowerCase().includes(lower)).slice(0, 8);
  }

  const url = new URL(`${TMDB_BASE}/search/person`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", q);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      profile_path: string | null;
      known_for_department?: string;
      popularity?: number;
      known_for?: Array<{ title?: string; name?: string }>;
    }>;
  };

  return [...(data.results ?? [])]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 8)
    .map((p) => {
      const knownTitle = p.known_for
        ?.map((k) => k.title || k.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      return {
        id: p.id,
        name: p.name,
        knownFor: knownTitle || p.known_for_department || undefined,
        profilePath: p.profile_path,
        profileUrl: profileUrl(p.profile_path),
      };
    });
}
