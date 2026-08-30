import { NextRequest, NextResponse } from "next/server";
import { discoverMovies } from "@/lib/tmdb";
import type { MovieFilters } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const filters: MovieFilters = {
    mediaType: sp.get("mediaType") || undefined,
    genre: sp.get("genre") || undefined,
    certification: sp.get("certification") || undefined,
    decade: sp.get("decade") || undefined,
    providers: sp.get("providers") || undefined,
    minScore: sp.get("minScore") || undefined,
    sort: sp.get("sort") || undefined,
    page: sp.get("page") || undefined,
    pageCount: sp.get("pageCount") || undefined,
    query: sp.get("query") || undefined,
    keyword: sp.get("keyword") || undefined,
    person: sp.get("person") || undefined,
    personName: sp.get("personName") || undefined,
    company: sp.get("company") || undefined,
    companyName: sp.get("companyName") || undefined,
  };

  try {
    const data = await discoverMovies(filters);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch movies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
