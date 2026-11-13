import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/billing";
import { outstandingByCurrency } from "@/lib/billing-queries";

/** Money at a glance for the dashboard: what is owed, what is overdue, what came in this month. */
export async function BillingSnapshot() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [outstanding, received, awaiting, spent] = await Promise.all([
    outstandingByCurrency(),
    prisma.payment.findMany({ where: { paidAt: { gte: monthStart } }, select: { amount: true, invoice: { select: { currency: true } } } }),
    prisma.quote.count({ where: { status: "SENT" } }),
    prisma.expense.groupBy({ by: ["currency"], where: { deletedAt: null, spentAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);
  const inMonth: Record<string, number> = {};
  for (const p of received) inMonth[p.invoice.currency] = (inMonth[p.invoice.currency] ?? 0) + p.amount;
  const spentIn: Record<string, number> = Object.fromEntries(spent.map((s) => [s.currency, s._sum.amount ?? 0]));
  const cur = [...new Set([...Object.keys(outstanding), ...Object.keys(inMonth), ...Object.keys(spentIn)])];
  if (cur.length === 0 && awaiting === 0) return null;

  return (
    <section aria-label="Billing" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cur.map((c) => (
        <div key={c} className="contents">
          <Link href="/admin/billing" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/60">
            <p className="text-sm text-muted-foreground">Received this month ({c})</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">{formatMoney(inMonth[c] ?? 0, c)}</p>
          </Link>
          <Link href="/admin/billing" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/60">
            <p className="text-sm text-muted-foreground">Outstanding ({c})</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">{formatMoney(outstanding[c]?.due ?? 0, c)}</p>
            {(outstanding[c]?.overdue ?? 0) > 0 && <p className="mt-0.5 text-sm text-destructive">{formatMoney(outstanding[c].overdue, c)} overdue</p>}
          </Link>
          {(spentIn[c] ?? 0) > 0 && (
            <Link href="/admin/billing/expenses?period=month" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/60">
              <p className="text-sm text-muted-foreground">Spent this month ({c})</p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">{formatMoney(spentIn[c], c)}</p>
              <p className={`mt-0.5 text-sm ${(inMonth[c] ?? 0) - spentIn[c] < 0 ? "text-destructive" : "text-muted-foreground"}`}>Profit {formatMoney((inMonth[c] ?? 0) - spentIn[c], c)}</p>
            </Link>
          )}
        </div>
      ))}
      {awaiting > 0 && (
        <Link href="/admin/billing" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/60">
          <p className="text-sm text-muted-foreground">Quotes awaiting an answer</p>
          <p className="mt-1 font-display text-xl font-bold">{awaiting}</p>
        </Link>
      )}
    </section>
  );
}
