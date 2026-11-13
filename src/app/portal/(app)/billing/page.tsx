import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, totals, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";

export const metadata: Metadata = { title: "Quotes and invoices" };

export default async function PortalBilling() {
  const user = await requirePortalUser();
  const [quotes, invoices] = await Promise.all([
    prisma.quote.findMany({ where: { userId: user.id, status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.invoice.findMany({ where: { userId: user.id, status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, include: { items: true, payments: true } }),
  ]);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Quotes and invoices</h1>
        <p className="mt-1 text-muted-foreground">Review and accept quotes, and see what has been paid.</p>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Quotes</h2>
        {quotes.length === 0 ? <p className="mt-3 text-muted-foreground">No quotes yet.</p> : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/portal/quotes/${q.id}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-secondary/60 sm:px-2">
                  <span><span className="font-medium">{q.title}</span> <span className="text-xs text-muted-foreground">{q.number}</span></span>
                  <span className="text-sm text-muted-foreground">{formatMoney(totals(q.items, q.taxBp).total, q.currency)} · {QUOTE_STATUS_LABEL[q.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Invoices</h2>
        {invoices.length === 0 ? <p className="mt-3 text-muted-foreground">No invoices yet.</p> : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {invoices.map((i) => {
              const total = totals(i.items, i.taxBp).total;
              const bal = balanceDue(total, i.payments);
              const overdue = isOverdue(i, bal);
              return (
                <li key={i.id}>
                  <Link href={`/portal/invoices/${i.id}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-secondary/60 sm:px-2">
                    <span><span className="font-medium">{i.title}</span> <span className="text-xs text-muted-foreground">{i.number}</span></span>
                    <span className={`text-sm ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {formatMoney(total, i.currency)} · {i.status === "VOID" ? "Void" : i.status === "PAID" ? `Paid ${i.paidAt ? fmtDate(i.paidAt) : ""}` : overdue ? `Overdue, ${formatMoney(bal, i.currency)} due` : `${formatMoney(bal, i.currency)} due${i.dueDate ? ` by ${fmtDate(i.dueDate)}` : ""}`}
                      <span className="sr-only"> ({INVOICE_STATUS_LABEL[i.status]})</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
