import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { formatMoney, totals } from "@/lib/billing";
import { QUOTE_NUDGE_DAYS, quoteNeedsNudge } from "@/lib/automation";

/**
 * One follow-up email for quotes still unanswered 5 days after sending (skips expired quotes).
 * Run daily:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/quote-followups
 * Claimed with a conditional update before sending, so overlapping runs never double-send.
 * Nothing is claimed while email is not configured. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  const candidates = await prisma.quote.findMany({
    where: { status: "SENT", nudgedAt: null, sentAt: { lte: new Date(now.getTime() - QUOTE_NUDGE_DAYS * 86_400_000) }, user: { disabledAt: null } },
    include: { items: true, user: { select: { name: true, email: true, billingEmail: true } } },
  });
  const settings = await getSiteSettings();
  let sent = 0;
  for (const q of candidates) {
    if (!quoteNeedsNudge(q, now)) continue;
    const claim = await prisma.quote.updateMany({ where: { id: q.id, status: "SENT", nudgedAt: null }, data: { nudgedAt: now } });
    if (!claim.count) continue;
    const ok = await sendMail({
      to: q.user.billingEmail || q.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Following up on quote ${q.number}`,
      text: `Hi ${q.user.name.split(" ")[0]},\n\nJust checking that you received quote ${q.number} (${q.title}, ${formatMoney(totals(q.items, q.taxBp).total, q.currency)}). ${q.validUntil ? `It is valid until ${q.validUntil.toLocaleDateString("en-GB")}. ` : ""}\n\nYou can review and accept it here:\n${siteUrl()}/q/${q.token}\n\nIf you have questions or want changes, just reply to this email.\n\n${settings.siteName}`,
    });
    if (!ok) {
      await prisma.quote.updateMany({ where: { id: q.id, nudgedAt: now }, data: { nudgedAt: null } });
      continue;
    }
    sent++;
    await logActivity({ userId: null, action: "updated", entityType: "Quote", entityId: q.id, message: `Follow-up sent for quote ${q.number}` });
  }
  return NextResponse.json({ candidates: candidates.length, sent });
}
