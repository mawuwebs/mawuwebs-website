import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMonthlyReport } from "@/lib/report";

/**
 * Monthly client IT reports. Schedule it for the 1st of each month:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/monthly-report
 * Safe to call twice: a client who already has last month's report is skipped. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const clients = await prisma.user.findMany({ where: { role: "CLIENT", disabledAt: null }, select: { id: true } });
  let created = 0;
  for (const c of clients) {
    if (await createMonthlyReport(c.id)) created++;
  }
  return NextResponse.json({ clients: clients.length, created });
}
