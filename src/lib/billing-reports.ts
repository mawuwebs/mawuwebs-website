import "server-only";
import { prisma } from "@/lib/prisma";
import { amountPaid, totals } from "@/lib/billing";
import { iso, DAY, type resolveRange } from "@/lib/billing-range";

export { PERIODS, resolveRange, seriesLabel, type PeriodKey } from "@/lib/billing-range";

export type CurrencyReport = {
  invoiced: number; collected: number; refunded: number; net: number; invoiceCount: number; paymentCount: number; outstanding: number; overdue: number;
  /** Unpaid balance of sent invoices by how far past due they are (now). */
  aging: { current: number; d1_30: number; d31_60: number; d61plus: number };
  series: { label: string; invoiced: number; collected: number }[];
  byMethod: { method: string; amount: number; count: number }[];
  topClients: { name: string; invoiced: number; collected: number }[];
};

export async function buildReport(range: ReturnType<typeof resolveRange>) {
  const [invoices, payments, open] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { notIn: ["DRAFT", "VOID"] }, issueDate: { gte: range.from, lt: range.to } },
      include: { items: true, user: { select: { name: true, company: true } } },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: range.from, lt: range.to } },
      include: { invoice: { select: { currency: true, user: { select: { name: true, company: true } } } } },
    }),
    prisma.invoice.findMany({ where: { status: "SENT" }, include: { items: true, payments: true } }),
  ]);

  const key = (d: Date) => (range.bucket === "month" ? iso(d).slice(0, 7) : iso(d));
  const labels: string[] = [];
  for (let d = new Date(range.from); d < range.to; d = range.bucket === "month" ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)) : new Date(+d + DAY)) labels.push(key(d));

  const out: Record<string, CurrencyReport> = {};
  const cur = (c: string) => (out[c] ??= {
    invoiced: 0, collected: 0, refunded: 0, net: 0, invoiceCount: 0, paymentCount: 0, outstanding: 0, overdue: 0,
    aging: { current: 0, d1_30: 0, d31_60: 0, d61plus: 0 },
    series: labels.map((label) => ({ label, invoiced: 0, collected: 0 })), byMethod: [], topClients: [],
  });
  const clients: Record<string, Map<string, { name: string; invoiced: number; collected: number }>> = {};
  const client = (c: string, u: { name: string; company: string }) => {
    const m = (clients[c] ??= new Map());
    const k = u.company || u.name;
    if (!m.has(k)) m.set(k, { name: k, invoiced: 0, collected: 0 });
    return m.get(k)!;
  };

  for (const i of invoices) {
    const r = cur(i.currency), t = totals(i.items, i.taxBp).total;
    r.invoiced += t; r.invoiceCount++;
    const s = r.series.find((x) => x.label === key(i.issueDate)); if (s) s.invoiced += t;
    client(i.currency, i.user).invoiced += t;
  }
  const methods: Record<string, Map<string, { amount: number; count: number }>> = {};
  for (const p of payments) {
    const c = p.invoice.currency, r = cur(c);
    if (p.amount < 0) { r.refunded += -p.amount; continue; }
    r.collected += p.amount; r.paymentCount++;
    const s = r.series.find((x) => x.label === key(p.paidAt)); if (s) s.collected += p.amount;
    client(c, p.invoice.user).collected += p.amount;
    const m = (methods[c] ??= new Map());
    const e = m.get(p.method) ?? { amount: 0, count: 0 };
    e.amount += p.amount; e.count++; m.set(p.method, e);
  }
  const now = new Date();
  for (const i of open) {
    const bal = Math.max(0, totals(i.items, i.taxBp).total - amountPaid(i.payments));
    if (bal <= 0) continue;
    const r = cur(i.currency);
    r.outstanding += bal;
    const late = i.dueDate ? Math.floor((+now - +i.dueDate) / 864e5) : 0;
    if (i.dueDate && i.dueDate < now) r.overdue += bal;
    if (late <= 0) r.aging.current += bal;
    else if (late <= 30) r.aging.d1_30 += bal;
    else if (late <= 60) r.aging.d31_60 += bal;
    else r.aging.d61plus += bal;
  }
  for (const c of Object.keys(out)) {
    out[c].net = out[c].collected - out[c].refunded;
    out[c].byMethod = [...(methods[c] ?? [])].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.amount - a.amount);
    out[c].topClients = [...(clients[c]?.values() ?? [])].sort((a, b) => b.invoiced + b.collected - (a.invoiced + a.collected)).slice(0, 5);
  }
  return out;
}
