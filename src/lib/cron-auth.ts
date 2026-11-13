import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Shared guard for cron routes. Returns a response to send back, or null when the caller may proceed. */
export function cronGuard(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return new NextResponse("Unauthorized", { status: 401 });
  return null;
}
