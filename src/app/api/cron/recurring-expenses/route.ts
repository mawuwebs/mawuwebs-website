import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { cronGuard } from "@/lib/cron-auth";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/billing";
import { duePeriods } from "@/lib/expenses";

/**
 * Records recurring expenses on their due date (hosting, domains, subscriptions), or emails a reminder for the
 * ones set to "remind me". Run daily:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/recurring-expenses
 * Each schedule is claimed with a conditional update first and each expense carries a unique key, so overlapping
 * runs never record a period twice. Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;

  const now = new Date();
  const due = await prisma.recurringExpense.findMany({ where: { active: true, nextRunAt: { lte: now } } });
  const canMail = mailConfigured();
  let recorded = 0;
  const reminders: string[] = [];

  for (const r of due) {
    // Reminder-only schedules wait until email works, otherwise the reminder would be silently lost.
    if (!r.autoRecord && !canMail) continue;
    const { due: dates, next } = duePeriods(r.nextRunAt, r.intervalMonths, now);
    const claim = await prisma.recurringExpense.updateMany({ where: { id: r.id, nextRunAt: r.nextRunAt, active: true }, data: { nextRunAt: next, lastRunAt: now } });
    if (!claim.count) continue;
    try {
      if (r.autoRecord) {
        for (const at of dates) {
          try {
            await prisma.expense.create({
              data: {
                category: r.category, vendor: r.vendor, description: r.description, amount: r.amount, taxAmount: r.taxAmount, currency: r.currency, method: r.method,
                spentAt: new Date(at.getTime() + 12 * 3600_000), // due dates are UTC midnight; noon keeps the date stable in any timezone
                source: "recurring", externalId: `recurring:${r.id}:${at.toISOString().slice(0, 10)}`,
              },
            });
            recorded++;
          } catch (err) {
            if ((err as { code?: string }).code !== "P2002") throw err; // already recorded by an earlier run
          }
        }
        if (dates.length) await logActivity({ userId: null, action: "created", entityType: "Expense", entityId: r.id, message: `Recurring expense recorded: ${r.description} (${dates.length})` });
      } else if (dates.length) {
        reminders.push(`${r.description}${r.vendor ? ` (${r.vendor})` : ""}: ${formatMoney(r.amount, r.currency)} was due ${dates[dates.length - 1].toISOString().slice(0, 10)}`);
      }
    } catch (err) {
      // Roll the schedule back so tomorrow's run retries.
      console.error("[recurring-expense] failed", r.id, err);
      await prisma.recurringExpense.updateMany({ where: { id: r.id, nextRunAt: next }, data: { nextRunAt: r.nextRunAt, lastRunAt: r.lastRunAt } });
    }
  }

  if (reminders.length) {
    const settings = await getSiteSettings();
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      subject: `Expenses due: ${reminders.length} to record`,
      text: `These recurring costs came due. Record them once paid:\n\n${reminders.map((s) => `- ${s}`).join("\n")}\n\n${siteUrl()}/admin/billing/expenses`,
    });
  }
  return NextResponse.json({ due: due.length, recorded, reminders: reminders.length });
}
