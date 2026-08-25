import { NextRequest, NextResponse } from "next/server";
import { searchPeople } from "@/lib/people";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";

  try {
    const results = await searchPeople(query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search people";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
