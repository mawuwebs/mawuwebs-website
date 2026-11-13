import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalendarEvents } from "@/lib/work-calendar";
import { buildIcs } from "@/lib/work";

/**
 * Personal calendar feed (ICS). Subscribe to /api/calendar/<token> from Google or Apple Calendar.
 * Contains the open tasks assigned to that staff member plus milestone and project due dates. The token is the credential.
 * Create or replace it on Admin > Client work > Calendar.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(clean)) return new NextResponse("Not found", { status: 404 });
  const user = await prisma.user.findUnique({ where: { calendarToken: clean }, select: { id: true, name: true, role: true, disabledAt: true } });
  if (!user || user.disabledAt || user.role === "CLIENT") return new NextResponse("Not found", { status: 404 });
  const now = new Date();
  const events = await getCalendarEvents({ userId: user.id, mineOnly: true, from: new Date(now.getTime() - 30 * 86_400_000), to: new Date(now.getTime() + 180 * 86_400_000) });
  return new NextResponse(buildIcs(`Client work: ${user.name}`, events), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=900", "x-robots-tag": "noindex" },
  });
}
