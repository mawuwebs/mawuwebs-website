import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public map of old path -> { to, permanent }, read by the proxy (cached there for 60s). */
export async function GET() {
  const rows = await prisma.redirect.findMany({
    select: { fromPath: true, toPath: true, permanent: true },
  });
  const map: Record<string, { to: string; permanent: boolean }> = {};
  for (const r of rows) map[r.fromPath] = { to: r.toPath, permanent: r.permanent };
  return Response.json(map);
}
