import { NextRequest, NextResponse } from "next/server";
import { searchSuggest } from "@/lib/suggest";
import type { MediaType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const mediaType = (
    request.nextUrl.searchParams.get("mediaType") === "tv" ? "tv" : "movie"
  ) as MediaType;

  try {
    const results = await searchSuggest(query, mediaType);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
