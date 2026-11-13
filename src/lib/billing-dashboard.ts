import "server-only";
import { prisma } from "@/lib/prisma";
import { balanceDue, isOverdue, totals } from "@/lib/billing";
import { getBillingSettings } from "@/lib/billing-settings";

const DAY = 864e5;
const day = (d: Date) => d.toISOString().slice(0, 10);

export type MoneyTrend = {
  currency: string;
  total: number;
  previousTotal: number;
  /** Amounts in minor units. */
  points: { label: string; prevLabel: string; current: number; previous: number }[];
};

/** Everything the main dashboard needs from billing and clients, for the last `days` days. */
export async function getBillingDashboard(days: number) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(+today - (days - 1) * DAY);
  const prevFrom = new Date(+from - days * DAY);
  const in7 = new Date(+now + 7 * DAY);
  const in30 = new Date(+now + 30 * DAY);

  const [sent, payments, quotesSent, quotesAccepted, invoicesIssued, invoicesPaid, enquiries, won, acceptedNoInvoice, expiring,
    drafts, clientCount, newClients, recurring, recurringDue, settings, totalInvoices, totalQuotes] = await Promise.all([
    prisma.invoice.findMany({ where: { status: "SENT" }, include: { items: true, payments: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: prevFrom } },
      select: { amount: true, paidAt: true, invoice: { select: { currency: true, user: { select: { id: true, name: true, company: true } } } } },
    }),
    prisma.quote.count({ where: { sentAt: { gte: from } } }),
    prisma.quote.count({ where: { acceptedAt: { gte: from } } }),
    prisma.invoice.count({ where: { status: { notIn: ["DRAFT", "VOID"] }, issueDate: { gte: from } } }),
    prisma.invoice.count({ where: { status: "PAID", paidAt: { gte: from } } }),
    prisma.contactSubmission.count({ where: { createdAt: { gte: from } } }),
    prisma.contactSubmission.count({ where: { createdAt: { gte: from }, status: "WON" } }),
    prisma.quote.count({ where: { status: "ACCEPTED", invoices: { none: {} } } }),
    prisma.quote.count({ where: { status: "SENT", validUntil: { gte: new Date(+now - DAY), lt: in7 } } }),
    prisma.invoice.count({ where: { status: "DRAFT" } }),
    prisma.user.count({ where: { role: "CLIENT", disabledAt: null } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: from } } }),
    prisma.recurringInvoice.findMany({
      where: { active: true, nextRunAt: { lt: in30 } },
      orderBy: { nextRunAt: "asc" },
      take: 5,
      include: { user: { select: { name: true, company: true } } },
    }),
    prisma.recurringInvoice.count({ where: { active: true, nextRunAt: { lt: in30 } } }),
    getBillingSettings(),
    prisma.invoice.count(),
    prisma.quote.count(),
  ]);

  // Open invoices: overdue, due within a week, and which reminders the next cron run will send.
  let overdue = 0, dueSoon = 0, soonReminders = 0, lateReminders = 0;
  for (const inv of sent) {
    const bal = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
    if (bal <= 0) continue;
    if (isOverdue(inv, bal, now)) {
      overdue++;
      if (inv.reminderCount < 2 && inv.dueDate && +inv.dueDate < +now - 3 * DAY) lateReminders++;
    } else if (inv.dueDate && inv.dueDate < in7) {
      dueSoon++;
      if (!inv.preDueReminderAt && inv.dueDate < new Date(+now + 3 * DAY)) soonReminders++;
    }
  }

  // Money collected per currency, bucketed by day, against the previous period.
  const byCur = new Map<string, { cur: Map<string, number>; prev: Map<string, number>; total: number; previousTotal: number }>();
  const clientTotals = new Map<string, Map<string, { name: string; amount: number }>>();
  for (const p of payments) {
    const c = p.invoice.currency;
    const e = byCur.get(c) ?? { cur: new Map(), prev: new Map(), total: 0, previousTotal: 0 };
    byCur.set(c, e);
    const k = day(p.paidAt);
    if (p.paidAt >= from) {
      e.cur.set(k, (e.cur.get(k) ?? 0) + p.amount);
      e.total += p.amount;
      const m = clientTotals.get(c) ?? new Map();
      clientTotals.set(c, m);
      const u = p.invoice.user;
      const row = m.get(u.id) ?? { name: u.company || u.name, amount: 0 };
      row.amount += p.amount;
      m.set(u.id, row);
    } else {
      e.prev.set(k, (e.prev.get(k) ?? 0) + p.amount);
      e.previousTotal += p.amount;
    }
  }
  const trends: MoneyTrend[] = [...byCur.entries()]
    .filter(([, e]) => e.total !== 0 || e.previousTotal !== 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 2)
    .map(([currency, e]) => ({
      currency,
      total: e.total,
      previousTotal: e.previousTotal,
      points: Array.from({ length: days }, (_, i) => {
        const d = new Date(+from + i * DAY), pd = new Date(+d - days * DAY);
        return { label: day(d).slice(5), prevLabel: day(pd).slice(5), current: e.cur.get(day(d)) ?? 0, previous: e.prev.get(day(pd)) ?? 0 };
      }),
    }));

  const topCurrency = trends[0]?.currency ?? null;
  const topClients = topCurrency
    ? [...(clientTotals.get(topCurrency)?.values() ?? [])].filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5)
    : [];

  return {
    attention: { overdue, dueSoon, expiring, acceptedNoInvoice, drafts },
    trends,
    funnel: { enquiries, won, quotesSent, quotesAccepted, invoicesIssued, invoicesPaid },
    clients: { total: clientCount, added: newClients, top: topClients, topCurrency },
    upcoming: {
      recurring: recurring.map((r) => ({
        id: r.id, title: r.title, client: r.user.company || r.user.name, amount: r.unitAmount, currency: r.currency,
        at: r.nextRunAt, autoSend: r.autoSend,
      })),
      recurringTotal: recurringDue,
      remindersEnabled: settings.remindersEnabled,
      soonReminders,
      lateReminders,
    },
    isEmpty: totalInvoices === 0 && totalQuotes === 0,
  };
}
