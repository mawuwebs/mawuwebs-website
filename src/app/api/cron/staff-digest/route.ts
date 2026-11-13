import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/portal-constants";
import { addDays, formatMinutes, taskIsOverdue } from "@/lib/work";
import { getWorkProjects } from "@/lib/work-queries";

/**
 * Monday-morning email to each staff member: their week ahead, anything overdue, hours logged last week.
 * Admins also get projects that are late, idle or near their hours budget, and client requests waiting for triage.
 * Run weekly:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/staff-digest
 * Sends nothing to a person with nothing to report. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  const weekAhead = addDays(now, 7);
  const lastWeek = addDays(now, -7);
  const [staff, projects, requests, hours] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "CLIENT" }, disabledAt: null }, select: { id: true, name: true, email: true, role: true } }),
    getWorkProjects(),
    prisma.task.findMany({ where: { fromClient: true, assigneeId: null, status: { not: "DONE" } }, include: { project: { select: { id: true, title: true } } }, take: 20 }),
    prisma.timeEntry.groupBy({ by: ["userId"], where: { workedOn: { gte: lastWeek } }, _sum: { minutes: true } }),
  ]);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "DONE" }, assigneeId: { in: staff.map((s) => s.id) }, project: { status: { not: "DONE" } }, dueDate: { not: null, lt: weekAhead } },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { dueDate: "asc" },
  });
  const settings = await getSiteSettings();
  const link = (id: string) => `${siteUrl()}/admin/work/${id}`;
  let sent = 0;

  for (const s of staff) {
    const mine = tasks.filter((t) => t.assigneeId === s.id);
    const late = mine.filter((t) => taskIsOverdue(t, now));
    const week = mine.filter((t) => !late.includes(t));
    const logged = hours.find((h) => h.userId === s.id)?._sum.minutes ?? 0;
    const parts: string[] = [];
    if (late.length) parts.push(`Overdue:\n${late.map((t) => `- ${t.title} (${t.project.title}), was due ${fmtDate(t.dueDate!)}\n  ${link(t.project.id)}`).join("\n")}`);
    if (week.length) parts.push(`Due in the next 7 days:\n${week.map((t) => `- ${t.title} (${t.project.title}), ${fmtDate(t.dueDate!)}\n  ${link(t.project.id)}`).join("\n")}`);
    if (s.role === "ADMIN") {
      const flagged = projects.filter((p) => p.health !== "ok");
      if (flagged.length) parts.push(`Projects needing attention:\n${flagged.map((p) => `- ${p.title} (${p.client.company || p.client.name}): ${p.health === "late" ? "late" : p.health === "budget" ? "hours budget nearly used" : "no activity for 2 weeks"}\n  ${link(p.id)}`).join("\n")}`);
      if (requests.length) parts.push(`Client requests waiting for triage:\n${requests.map((t) => `- ${t.title} (${t.project.title})\n  ${link(t.project.id)}`).join("\n")}`);
    }
    if (!parts.length) continue;
    const ok = await sendMail({
      to: s.email,
      subject: `Your week: ${late.length ? `${late.length} overdue, ` : ""}${week.length} due soon`,
      text: `Hi ${s.name.split(" ")[0]},\n\n${parts.join("\n\n")}\n\nYou logged ${formatMinutes(logged)} last week.\n\n${settings.siteName}`,
    });
    if (ok) sent++;
  }
  return NextResponse.json({ staff: staff.length, sent });
}
