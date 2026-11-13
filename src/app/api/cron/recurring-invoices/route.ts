import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { deliverInvoice, nextNumber } from "@/lib/invoicing";
import { randomBytes } from "node:crypto";

/**
 * Creates invoices for due recurring schedules. Run it daily:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/recurring-invoices
 * Safe to call repeatedly: each schedule is claimed with a conditional update before its invoice is made,
 * so overlapping runs cannot bill twice. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return new NextResponse("Unauthorized", { status: 401 });

  const now = new Date();
  const due = await prisma.recurringInvoice.findMany({ where: { active: true, nextRunAt: { lte: now }, user: { disabledAt: null } } });
  let created = 0;
  let sent = 0;
  for (const r of due) {
    // Skip missed periods: move forward until the next run is in the future, billing once.
    let next = addMonths(r.nextRunAt, r.intervalMonths);
    while (next <= now) next = addMonths(next, r.intervalMonths);
    const claim = await prisma.recurringInvoice.updateMany({ where: { id: r.id, nextRunAt: r.nextRunAt, active: true }, data: { nextRunAt: next, lastRunAt: now } });
    if (!claim.count) continue;
    try {
      const invoice = await prisma.$transaction(async (tx) =>
        tx.invoice.create({
          data: {
            number: await nextNumber(tx, "invoice"), token: randomBytes(24).toString("base64url"), userId: r.userId, title: r.title,
            currency: r.currency, taxBp: r.taxBp, notes: r.notes, dueDate: new Date(now.getTime() + r.dueDays * 86400_000),
            items: { create: [{ description: r.description, quantity: 1, unitAmount: r.unitAmount, position: 0 }] },
          },
        })
      );
      created++;
      await logActivity({ userId: null, action: "created", entityType: "Invoice", entityId: invoice.id, message: `Recurring billing created invoice ${invoice.number}` });
      if (r.autoSend && (await deliverInvoice(invoice.id)).ok) sent++;
    } catch (err) {
      // Roll the schedule back so tomorrow's run retries instead of silently skipping a period.
      console.error("[recurring] failed", r.id, err);
      await prisma.recurringInvoice.updateMany({ where: { id: r.id, nextRunAt: next }, data: { nextRunAt: r.nextRunAt, lastRunAt: r.lastRunAt } });
    }
  }
  return NextResponse.json({ due: due.length, created, sent });
}
