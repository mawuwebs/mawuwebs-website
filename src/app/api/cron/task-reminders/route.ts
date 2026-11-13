import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/portal-constants";

/**
 * Emails each staff member one digest of their overdue tasks (and tasks due tomorrow), once per task.
 * Run daily:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/task-reminders
 * Tasks are claimed with a conditional update before sending, so overlapping runs never double-send.
 * Nothing is claimed while email is not configured. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  // dueDate is stored at 12:00 UTC of the due day. "Overdue" = that day has fully passed; "tomorrow" = ends within 36h.
  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" }, overdueNotifiedAt: null, assigneeId: { not: null }, dueDate: { not: null, lt: new Date(now.getTime() + 36 * 3_600_000) },
      project: { status: { not: "DONE" } }, assignee: { disabledAt: null },
    },
    include: { assignee: { select: { id: true, name: true, email: true } }, project: { select: { id: true, title: true, user: { select: { name: true, company: true } } } } },
    orderBy: { dueDate: "asc" },
  });
  const settings = await getSiteSettings();
  const byPerson = new Map<string, typeof tasks>();
  for (const t of tasks) byPerson.set(t.assignee!.id, [...(byPerson.get(t.assignee!.id) ?? []), t]);

  let people = 0;
  let marked = 0;
  for (const list of byPerson.values()) {
    const claimed: typeof tasks = [];
    for (const t of list) {
      const claim = await prisma.task.updateMany({ where: { id: t.id, overdueNotifiedAt: null }, data: { overdueNotifiedAt: now } });
      if (claim.count) claimed.push(t);
    }
    if (!claimed.length) continue;
    const who = claimed[0].assignee!;
    const line = (t: (typeof tasks)[number]) => `- ${t.title} (${t.project.title}, ${t.project.user.company || t.project.user.name}): due ${fmtDate(t.dueDate!)}\n  ${siteUrl()}/admin/work/${t.project.id}`;
    const late = claimed.filter((t) => t.dueDate!.getTime() + 86_400_000 <= now.getTime());
    const soon = claimed.filter((t) => !late.includes(t));
    const ok = await sendMail({
      to: who.email,
      subject: late.length ? `${late.length} overdue task${late.length === 1 ? "" : "s"} assigned to you` : "Tasks due tomorrow",
      text: `Hi ${who.name.split(" ")[0]},\n\n${late.length ? `Overdue:\n${late.map(line).join("\n")}\n\n` : ""}${soon.length ? `Due tomorrow:\n${soon.map(line).join("\n")}\n\n` : ""}If a date has changed, update the task and it will not be flagged again.\n\n${settings.siteName}`,
    });
    if (!ok) {
      await prisma.task.updateMany({ where: { id: { in: claimed.map((t) => t.id) }, overdueNotifiedAt: now }, data: { overdueNotifiedAt: null } });
      continue;
    }
    people++;
    marked += claimed.length;
  }
  return NextResponse.json({ tasks: tasks.length, people, marked });
}
