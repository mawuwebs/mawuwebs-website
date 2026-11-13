import "server-only";
import { prisma } from "@/lib/prisma";
import { amountPaid, totals } from "@/lib/billing";

export const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

/** Resolve a period to a UTC half-open range [from, to). Weeks start Monday. */
export function resolveRange(period: string | undefined, fromS?: string, toS?: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let key = (PERIODS.some((p) => p.key === period) ? period : "month") as PeriodKey;
  let from = today;
  let to = new Date(+today + DAY);
  if (key === "week") { from = new Date(+today - ((today.getUTCDay() + 6) % 7) * DAY); to = new Date(+from + 7 * DAY); }
  else if (key === "month") { from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)); }
  else if (key === "quarter") { const q = Math.floor(today.getUTCMonth() / 3) * 3; from = new Date(Date.UTC(today.getUTCFullYear(), q, 1)); to = new Date(Date.UTC(today.getUTCFullYear(), q + 3, 1)); }
  else if (key === "year") { from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1)); to = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)); }
  else if (key === "custom") {
    const f = parse(fromS), t = parse(toS);
    if (f && t && t >= f && +t - +f < 800 * DAY) { from = f; to = new Date(+t + DAY); }
    else {
      key = "month";
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    }
  }
  const days = Math.round((+to - +from) / DAY);
  return { key, from, to, days, bucket: (days > 62 ? "month" : "day") as "day" | "month", fromS: iso(from), toS: iso(new Date(+to - DAY)) };
}

export type CurrencyReport = {
  invoiced: number; collected: number; invoiceCount: number; paymentCount: number; outstanding: number; overdue: number;
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
    invoiced: 0, collected: 0, invoiceCount: 0, paymentCount: 0, outstanding: 0, overdue: 0,
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
    if (i.dueDate && i.dueDate < now) r.overdue += bal;
  }
  for (const c of Object.keys(out)) {
    out[c].byMethod = [...(methods[c] ?? [])].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.amount - a.amount);
    out[c].topClients = [...(clients[c]?.values() ?? [])].sort((a, b) => b.invoiced + b.collected - (a.invoiced + a.collected)).slice(0, 5);
  }
  return out;
}

export function seriesLabel(label: string, bucket: "day" | "month") {
  const d = new Date(`${label}${bucket === "month" ? "-01" : ""}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", bucket === "month" ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
}
