import { NextResponse, type NextRequest } from "next/server";
import { searchSite } from "@/lib/content";
import { rateLimited } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (await rateLimited("search", 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 80) return NextResponse.json({ services: [], projects: [], posts: [] });
  return NextResponse.json(await searchSite(q));
}
