import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Internal map of old path -> { to, permanent }, read by the proxy (cached there for 60s). */
export async function GET(request: NextRequest) {
  const want = Buffer.from(process.env.AUTH_SECRET ?? "");
  const given = Buffer.from(request.headers.get("x-redirect-map-key") ?? "");
  if (!want.length || given.length !== want.length || !timingSafeEqual(given, want)) {
    return new Response("Not found", { status: 404 });
  }
  const rows = await prisma.redirect.findMany({
    select: { fromPath: true, toPath: true, permanent: true },
  });
  const map: Record<string, { to: string; permanent: boolean }> = {};
  for (const r of rows) map[r.fromPath] = { to: r.toPath, permanent: r.permanent };
  return Response.json(map);
}
