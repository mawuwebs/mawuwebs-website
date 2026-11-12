import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";

const CHANNELS = ["phone", "whatsapp", "email"] as const;

/** Counts a tap on a phone, WhatsApp or email link. No personal data: a channel and the page it was on. */
export async function POST(request: NextRequest) {
  if (await rateLimited("track", 30, 60_000)) return new NextResponse(null, { status: 429 });
  let body: { channel?: unknown; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const channel = String(body.channel ?? "");
  if (!(CHANNELS as readonly string[]).includes(channel)) return new NextResponse(null, { status: 400 });
  // Path only, never a query string, so nothing identifying is stored.
  const page = String(body.page ?? "").split("?")[0].slice(0, 120);
  try {
    await prisma.contactClick.create({ data: { channel, page } });
  } catch (err) {
    console.error("[track] could not save", err);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
