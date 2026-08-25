import { NextRequest, NextResponse } from "next/server";
import { getTitleDetail } from "@/lib/title-detail";
import type { MediaType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mediaType = (sp.get("mediaType") === "tv" ? "tv" : "movie") as MediaType;
  const id = Number(sp.get("id"));

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const data = await getTitleDetail(mediaType, id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load title";
    const status = message.includes("404") || message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
