import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Liveness + database check for uptime monitors. Returns no data beyond ok/not ok. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health] database check failed", err);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
