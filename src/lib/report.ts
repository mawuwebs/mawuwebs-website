import "server-only";
import { prisma } from "@/lib/prisma";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { TICKET_STATUS_LABEL, fmtDate } from "@/lib/portal";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Previous calendar month by default. `ref` is any date inside the month you want. */
export function monthRange(ref = new Date(), offset = -1) {
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end, label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}` };
}

/**
 * Builds the monthly IT report from real ticket and asset data and saves it for the client.
 * Returns null if a report for that month already exists, so the cron job and the admin button can't double up.
 */
export async function createMonthlyReport(userId: string, opts: { notify?: boolean; offset?: number } = {}) {
  const { start, end, label } = monthRange(new Date(), opts.offset ?? -1);
  const title = `IT report: ${label}`;
  if (await prisma.clientDocument.findFirst({ where: { userId, kind: "report", title } })) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, company: true } });
  if (!user) return null;

  const soon = new Date(end.getTime() + 60 * 86400_000);
  const [opened, resolved, stillOpen, expiring, assetCount] = await Promise.all([
    prisma.ticket.findMany({ where: { userId, createdAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } }),
    prisma.ticket.findMany({ where: { userId, resolvedAt: { gte: start, lt: end } }, select: { createdAt: true, resolvedAt: true } }),
    prisma.ticket.findMany({ where: { userId, status: { not: "RESOLVED" } }, orderBy: { createdAt: "asc" } }),
    prisma.clientAsset.findMany({ where: { userId, expiresAt: { not: null, lt: soon } }, orderBy: { expiresAt: "asc" } }),
    prisma.clientAsset.count({ where: { userId } }),
  ]);

  const hours = resolved.map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3600_000);
  const avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null;
  const avgText = avg === null ? "n/a" : avg < 48 ? `${Math.round(avg)} hours` : `${Math.round(avg / 24)} days`;

  const lines = [
    `Summary for ${user.company || user.name}, ${label}`,
    "",
    `Support requests opened: ${opened.length}`,
    `Support requests resolved: ${resolved.length}`,
    `Average time to resolve: ${avgText}`,
    `Still open today: ${stillOpen.length}`,
    `Devices and services we look after: ${assetCount}`,
    "",
    "Requests this month",
    ...(opened.length ? opened.map((t) => `- ${fmtDate(t.createdAt)}: ${t.subject} (${TICKET_STATUS_LABEL[t.status]})`) : ["- None"]),
    "",
    "Open items needing attention",
    ...(stillOpen.length ? stillOpen.map((t) => `- ${t.subject} (${TICKET_STATUS_LABEL[t.status]}, since ${fmtDate(t.createdAt)})`) : ["- None"]),
    "",
    "Renewals and expiries in the next 60 days",
    ...(expiring.length
      ? expiring.map((a) => `- ${a.name} (${a.type}): ${a.expiresAt! < end ? "EXPIRED " : "expires "}${fmtDate(a.expiresAt!)}`)
      : ["- None"]),
  ];

  const doc = await prisma.clientDocument.create({ data: { userId, kind: "report", title, body: lines.join("\n") } });

  if (opts.notify !== false) {
    const settings = await getSiteSettings();
    await sendMail({
      to: user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `${title} | ${settings.siteName}`,
      text: `Hi ${user.name.split(" ")[0]},\n\nYour ${label} IT report is ready:\n\n${siteUrl()}/portal/documents/${doc.id}\n\n${settings.siteName}`,
    });
  }
  return doc;
}
