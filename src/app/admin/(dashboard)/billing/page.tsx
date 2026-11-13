import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, totals, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import { outstandingByCurrency } from "@/lib/billing-queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await guardArea("billing");
  const [outstanding, quotes, invoices] = await Promise.all([
    outstandingByCurrency(),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { items: true, user: { select: { name: true, company: true } } } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { items: true, payments: true, user: { select: { name: true, company: true } } } }),
  ]);
  const currencies = Object.entries(outstanding);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Quotes, invoices and payments. Pick a client to start a new one.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/billing/quotes/new" className={buttonVariants({ variant: "outline", size: "sm" })}>New quote</Link>
          <Link href="/admin/billing/invoices/new" className={buttonVariants({ size: "sm" })}>New invoice</Link>
        </div>
      </div>

      <section aria-label="Outstanding" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currencies.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground sm:col-span-3">Nothing outstanding.</p>
        ) : currencies.map(([cur, v]) => (
          <div key={cur} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Outstanding ({cur})</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{formatMoney(v.due, cur)}</p>
            <p className={`mt-1 text-sm ${v.overdue ? "text-destructive" : "text-muted-foreground"}`}>{formatMoney(v.overdue, cur)} overdue</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Invoices</h2>
        {invoices.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3 font-medium">Number</th><th className="p-3 font-medium">Client</th><th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Balance</th><th className="p-3 font-medium">Due</th><th className="p-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {invoices.map((i) => {
                  const total = totals(i.items, i.taxBp).total;
                  const bal = i.status === "SENT" ? balanceDue(total, i.payments) : 0;
                  const overdue = isOverdue(i, bal);
                  return (
                    <tr key={i.id}>
                      <td className="p-3"><Link href={`/admin/billing/invoices/${i.id}`} className="font-medium hover:underline">{i.number}</Link><div className="text-xs text-muted-foreground">{i.title}</div></td>
                      <td className="p-3">{i.user.company || i.user.name}</td>
                      <td className="p-3 tabular-nums">{formatMoney(total, i.currency)}</td>
                      <td className="p-3 tabular-nums">{bal ? formatMoney(bal, i.currency) : "—"}</td>
                      <td className={`p-3 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{i.dueDate ? fmtDate(i.dueDate) : "—"}</td>
                      <td className="p-3"><Badge variant="outline" className={overdue ? "border-destructive/40 text-destructive" : i.status === "PAID" ? "border-success/30 bg-success/10 text-success" : ""}>{overdue ? "Overdue" : INVOICE_STATUS_LABEL[i.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Quotes</h2>
        {quotes.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3 font-medium">Number</th><th className="p-3 font-medium">Client</th><th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Valid until</th><th className="p-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="p-3"><Link href={`/admin/billing/quotes/${q.id}`} className="font-medium hover:underline">{q.number}</Link><div className="text-xs text-muted-foreground">{q.title}</div></td>
                    <td className="p-3">{q.user.company || q.user.name}</td>
                    <td className="p-3 tabular-nums">{formatMoney(totals(q.items, q.taxBp).total, q.currency)}</td>
                    <td className="p-3 text-muted-foreground">{q.validUntil ? fmtDate(q.validUntil) : "—"}</td>
                    <td className="p-3"><Badge variant="outline" className={q.status === "ACCEPTED" ? "border-success/30 bg-success/10 text-success" : ""}>{QUOTE_STATUS_LABEL[q.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
