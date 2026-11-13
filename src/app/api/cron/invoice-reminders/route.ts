import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { getBillingSettings } from "@/lib/billing-settings";
import { balanceDue, formatMoney, reminderStage, totals } from "@/lib/billing";

/**
 * Emails clients about invoices: a "due soon" note up to 3 days before the due date, a first overdue reminder 3 days
 * after the due date and a final one at 14 days.
 * Run daily:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/invoice-reminders
 * Each stage is claimed with a conditional update before sending, so overlapping runs never double-send.
 * Nothing is claimed while email is not configured, so no reminder is silently used up. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return new NextResponse("Unauthorized", { status: 401 });

  const billing = await getBillingSettings();
  if (!billing.remindersEnabled) return NextResponse.json({ skipped: "reminders are switched off in Billing settings" });
  if (!mailConfigured()) return NextResponse.json({ skipped: "email is not configured" });

  const now = new Date();
  const candidates = await prisma.invoice.findMany({
    where: { status: "SENT", reminderCount: { lt: 2 }, dueDate: { lt: new Date(now.getTime() - 3 * 86400_000) }, user: { disabledAt: null } },
    include: { items: true, payments: true, user: { select: { name: true, email: true, billingEmail: true } } },
  });
  const settings = await getSiteSettings();
  let sent = 0;

  // "Due soon": once, when the due date is within the next 3 days.
  const soon = await prisma.invoice.findMany({
    where: { status: "SENT", preDueReminderAt: null, dueDate: { gte: now, lt: new Date(now.getTime() + 3 * 86400_000) }, user: { disabledAt: null } },
    include: { items: true, payments: true, user: { select: { name: true, email: true, billingEmail: true } } },
  });
  let soonSent = 0;
  for (const inv of soon) {
    const balance = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
    if (balance <= 0) continue;
    const claim = await prisma.invoice.updateMany({ where: { id: inv.id, status: "SENT", preDueReminderAt: null }, data: { preDueReminderAt: now } });
    if (!claim.count) continue;
    const ok = await sendMail({
      to: inv.user.billingEmail || inv.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Invoice ${inv.number} is due on ${inv.dueDate!.toLocaleDateString("en-GB")}`,
      text: `Hi ${inv.user.name.split(" ")[0]},\n\nA quick heads-up that invoice ${inv.number} (${inv.title}) is due on ${inv.dueDate!.toLocaleDateString("en-GB")}. The balance is ${formatMoney(balance, inv.currency)}.\n\nView and pay it here:\n${siteUrl()}/i/${inv.token}\n\nIf you have already paid, thank you, and please ignore this message.\n\n${settings.siteName}`,
    });
    if (!ok) {
      await prisma.invoice.updateMany({ where: { id: inv.id }, data: { preDueReminderAt: null } });
      continue;
    }
    soonSent++;
    await logActivity({ userId: null, action: "updated", entityType: "Invoice", entityId: inv.id, message: `Due-soon reminder sent for ${inv.number}` });
  }

  for (const inv of candidates) {
    const balance = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
    const stage = reminderStage(inv, balance, now);
    if (!stage) continue;
    const claim = await prisma.invoice.updateMany({
      where: { id: inv.id, status: "SENT", reminderCount: inv.reminderCount },
      data: { reminderCount: stage, lastReminderAt: now },
    });
    if (!claim.count) continue;
    const link = `${siteUrl()}/i/${inv.token}`;
    const ok = await sendMail({
      to: inv.user.billingEmail || inv.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `${stage === 2 ? "Final reminder" : "Reminder"}: invoice ${inv.number} is overdue`,
      text: `Hi ${inv.user.name.split(" ")[0]},\n\n${stage === 2 ? "This is a final reminder that" : "A friendly reminder that"} invoice ${inv.number} (${inv.title}) was due on ${inv.dueDate!.toLocaleDateString("en-GB")}. The balance is ${formatMoney(balance, inv.currency)}.\n\nView and pay it here:\n${link}\n\nIf you have already paid, please reply with the payment details and ignore this message.\n\n${settings.siteName}`,
    });
    if (!ok) {
      // Give the stage back so tomorrow's run tries again.
      await prisma.invoice.updateMany({ where: { id: inv.id, reminderCount: stage }, data: { reminderCount: inv.reminderCount, lastReminderAt: inv.lastReminderAt } });
      continue;
    }
    sent++;
    await logActivity({ userId: null, action: "updated", entityType: "Invoice", entityId: inv.id, message: `Overdue reminder ${stage} sent for ${inv.number}` });
  }
  return NextResponse.json({ candidates: candidates.length, sent, dueSoon: soonSent });
}
