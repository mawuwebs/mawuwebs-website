import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/portal-constants";
import { progressOf } from "@/lib/work";
import { progressUnsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Weekly progress email to each client with an active project: what finished this week and what is coming up.
 * Only tasks marked "show to client" appear, and nothing is sent when there is nothing new to say.
 * Run weekly:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/project-updates
 * Claimed with a conditional update before sending, so overlapping runs never double-send.
 * Nothing is claimed while email is not configured. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6.5 * 86_400_000);
  const stale = [{ lastClientUpdateAt: null }, { lastClientUpdateAt: { lt: weekAgo } }];
  const projects = await prisma.clientProject.findMany({
    where: { status: { in: ["IN_PROGRESS", "REVIEW"] }, OR: stale, user: { disabledAt: null, progressEmails: true } },
    include: { user: { select: { id: true, name: true, email: true, billingEmail: true } }, tasks: { where: { clientVisible: true }, select: { title: true, status: true, dueDate: true, completedAt: true } } },
  });
  const settings = await getSiteSettings();
  let sent = 0;
  for (const p of projects) {
    const doneThisWeek = p.tasks.filter((t) => t.status === "DONE" && t.completedAt && t.completedAt >= weekAgo);
    if (doneThisWeek.length === 0) continue; // nothing new to report
    const upcoming = p.tasks.filter((t) => t.status !== "DONE").sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity)).slice(0, 5);
    const claim = await prisma.clientProject.updateMany({ where: { id: p.id, OR: stale }, data: { lastClientUpdateAt: now } });
    if (!claim.count) continue;
    const pr = progressOf(p.tasks);
    const ok = await sendMail({
      to: p.user.billingEmail || p.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Progress update: ${p.title}`,
      text: `Hi ${p.user.name.split(" ")[0]},\n\nHere is where "${p.title}" stands: ${pr.done} of ${pr.total} tasks done (${pr.pct}%).\n\nFinished this week:\n${doneThisWeek.map((t) => `- ${t.title}`).join("\n")}\n\n${upcoming.length ? `Coming up:\n${upcoming.map((t) => `- ${t.title}${t.dueDate ? ` (${fmtDate(t.dueDate)})` : ""}`).join("\n")}\n\n` : ""}See the full picture in your portal:\n${siteUrl()}/portal/projects\n\nDo not want these weekly updates? Stop them here:\n${progressUnsubscribeUrl(siteUrl(), p.user.id)}\n\n${settings.siteName}`,
    });
    if (!ok) {
      await prisma.clientProject.updateMany({ where: { id: p.id, lastClientUpdateAt: now }, data: { lastClientUpdateAt: p.lastClientUpdateAt } });
      continue;
    }
    sent++;
    await logActivity({ userId: null, action: "updated", entityType: "ClientProject", entityId: p.id, message: `Weekly progress email sent for ${p.title}` });
  }
  return NextResponse.json({ projects: projects.length, sent });
}
