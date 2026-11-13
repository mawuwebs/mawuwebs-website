import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { renewalLevel, RENEWAL_LABEL } from "@/lib/automation";
import { fmtDate } from "@/lib/portal-constants";

/**
 * Renewal notices for client items with an expiry date (domains, hosting, licences, warranties).
 * One email to the client at 30 days, 7 days and on expiry, plus one summary to you per run.
 * Run daily:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/asset-renewals
 * Each notice is claimed with a conditional update before sending, so overlapping runs never double-send.
 * Nothing is claimed while email is not configured. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  // Expired items are only chased for 30 days; after that the item is simply stale.
  const items = await prisma.clientAsset.findMany({
    where: { expiresAt: { not: null, lt: new Date(now.getTime() + 30 * 86_400_000), gt: new Date(now.getTime() - 30 * 86_400_000) }, renewalStage: { lt: 3 }, user: { disabledAt: null } },
    include: { user: { select: { name: true, email: true, billingEmail: true, company: true } } },
  });
  const settings = await getSiteSettings();
  const sent: string[] = [];

  for (const a of items) {
    const level = renewalLevel(a.expiresAt, now);
    if (level === 0 || level <= a.renewalStage) continue;
    const claim = await prisma.clientAsset.updateMany({ where: { id: a.id, renewalStage: a.renewalStage }, data: { renewalStage: level } });
    if (!claim.count) continue;
    const label = RENEWAL_LABEL[level as 1 | 2 | 3];
    const ok = await sendMail({
      to: a.user.billingEmail || a.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `${a.type} renewal: ${a.name} ${label}`,
      text: `Hi ${a.user.name.split(" ")[0]},\n\nYour ${a.type.toLowerCase()} "${a.name}" ${label} (${fmtDate(a.expiresAt!)}).\n\n${level === 3 ? "Please reply as soon as you can so we can renew it and avoid any interruption." : "Reply to this email and we will arrange the renewal and send you the invoice."}\n\nYou can see everything we look after for you in your portal:\n${siteUrl()}/portal/assets\n\n${settings.siteName}`,
    });
    if (!ok) {
      await prisma.clientAsset.updateMany({ where: { id: a.id, renewalStage: level }, data: { renewalStage: a.renewalStage } });
      continue;
    }
    sent.push(`${a.user.company || a.user.name}: ${a.name} (${a.type}) ${label}, ${fmtDate(a.expiresAt!)}`);
    await logActivity({ userId: null, action: "updated", entityType: "Client", entityId: a.userId, message: `Renewal notice sent: ${a.name} ${label}` });
  }

  if (sent.length) {
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      subject: `Renewals: ${sent.length} notice${sent.length === 1 ? "" : "s"} sent today`,
      text: `Notices sent to clients today:\n\n${sent.map((s) => `- ${s}`).join("\n")}\n\nBill the renewals from ${siteUrl()}/admin/billing`,
    });
  }
  return NextResponse.json({ checked: items.length, sent: sent.length });
}
