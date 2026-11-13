import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, totals, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import { outstandingByCurrency } from "@/lib/billing-queries";
import { BarChart3, FileText, Receipt, Settings2, Download, Plus, Wallet, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "open", label: "Awaiting payment" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await guardArea("billing");
  const { status = "all" } = await searchParams;
  const [outstanding, quotes, invoices] = await Promise.all([
    outstandingByCurrency(),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { items: true, user: { select: { name: true, company: true } } } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { items: true, payments: true, user: { select: { name: true, company: true } } } }),
  ]);
  const currencies = Object.entries(outstanding);
  const rows = invoices.map((i) => {
    const total = totals(i.items, i.taxBp).total;
    const bal = i.status === "SENT" ? balanceDue(total, i.payments) : 0;
    return { i, total, bal, overdue: isOverdue(i, bal) };
  });
  const counts: Record<string, number> = {
    all: rows.length,
    draft: rows.filter((r) => r.i.status === "DRAFT").length,
    open: rows.filter((r) => r.i.status === "SENT").length,
    overdue: rows.filter((r) => r.overdue).length,
    paid: rows.filter((r) => r.i.status === "PAID").length,
  };
  const shown = rows.filter((r) =>
    status === "draft" ? r.i.status === "DRAFT" : status === "open" ? r.i.status === "SENT" : status === "overdue" ? r.overdue : status === "paid" ? r.i.status === "PAID" : true,
  );
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Quotes, invoices and payments in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/billing/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}><BarChart3 className="size-4" /> Reports</Link>
          <Link href="/admin/billing/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}><Settings2 className="size-4" /> Settings</Link>
          <details className="group relative">
            <summary className={`${buttonVariants({ variant: "ghost", size: "sm" })} cursor-pointer list-none`}><Download className="size-4" /> Export</summary>
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-border bg-popover p-1 text-sm shadow-lg">
              {/* File downloads, not pages: plain links are correct. */}
              <a href="/admin/billing/export?kind=invoices" download className="block rounded-lg px-3 py-2 hover:bg-secondary">Invoices (CSV)</a>
              <a href="/admin/billing/export?kind=payments" download className="block rounded-lg px-3 py-2 hover:bg-secondary">Payments (CSV)</a>
            </div>
          </details>
          <Link href="/admin/billing/quotes/new" className={buttonVariants({ variant: "outline", size: "sm" })}><FileText className="size-4" /> New quote</Link>
          <Link href="/admin/billing/invoices/new" className={buttonVariants({ size: "sm" })}><Plus className="size-4" /> New invoice</Link>
        </div>
      </div>

      <section aria-label="Outstanding" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currencies.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground sm:col-span-3">
            <Wallet className="size-5 text-success" /> Nothing outstanding. Every sent invoice is settled.
          </div>
        ) : currencies.map(([cur, v]) => (
          <div key={cur} className="rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" /> Outstanding ({cur})</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatMoney(v.due, cur)}</p>
            <p className={`mt-1 flex items-center gap-1.5 text-sm ${v.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {v.overdue > 0 && <AlertTriangle className="size-4" />}{formatMoney(v.overdue, cur)} overdue
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Receipt className="size-5 text-muted-foreground" /> Invoices</h2>
          <nav aria-label="Filter invoices" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link key={f.key} href={f.key === "all" ? "/admin/billing" : `/admin/billing?status=${f.key}`} aria-current={status === f.key || (f.key === "all" && !FILTERS.some((x) => x.key === status)) ? "page" : undefined}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground">
                {f.label} <span className="tabular-nums opacity-70">{counts[f.key]}</span>
              </Link>
            ))}
          </nav>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">{rows.length === 0 ? "No invoices yet." : "No invoices match this filter."}</p>
            {rows.length === 0 && <Link href="/admin/billing/invoices/new" className={`${buttonVariants({ size: "sm" })} mt-3`}><Plus className="size-4" /> Create your first invoice</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3 font-medium">Number</th><th className="p-3 font-medium">Client</th><th className="p-3 text-right font-medium">Total</th><th className="p-3 text-right font-medium">Balance</th><th className="p-3 font-medium">Due</th><th className="p-3 font-medium"><span className="sr-only">Actions</span></th><th className="p-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {shown.map(({ i, total, bal, overdue }) => (
                  <tr key={i.id} className="transition-colors hover:bg-secondary/40">
                    <td className="p-3"><Link href={`/admin/billing/invoices/${i.id}`} className="font-medium hover:underline">{i.number}</Link><div className="max-w-[16rem] truncate text-xs text-muted-foreground">{i.title}</div></td>
                    <td className="p-3">{i.user.company || i.user.name}</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(total, i.currency)}</td>
                    <td className="p-3 text-right font-medium tabular-nums">{bal ? formatMoney(bal, i.currency) : <span className="font-normal text-muted-foreground">—</span>}</td>
                    <td className={`p-3 ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>{i.dueDate ? fmtDate(i.dueDate) : "—"}</td>
                    <td className="p-3 text-right">{i.status !== "PAID" && i.status !== "VOID" && (i.status === "DRAFT" || bal > 0) && <Link href={`/admin/billing/invoices/${i.id}#record-payment`} className="text-xs underline underline-offset-2">Record payment</Link>}</td>
                      <td className="p-3"><Badge variant="outline" className={overdue ? "border-destructive/40 text-destructive" : i.status === "PAID" ? "border-success/30 bg-success/10 text-success" : ""}>{overdue ? "Overdue" : INVOICE_STATUS_LABEL[i.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="size-5 text-muted-foreground" /> Quotes</h2>
        {quotes.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No quotes yet.</div> : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3 font-medium">Number</th><th className="p-3 font-medium">Client</th><th className="p-3 text-right font-medium">Total</th><th className="p-3 font-medium">Valid until</th><th className="p-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-secondary/40">
                    <td className="p-3"><Link href={`/admin/billing/quotes/${q.id}`} className="font-medium hover:underline">{q.number}</Link><div className="text-xs text-muted-foreground">{q.title}</div></td>
                    <td className="p-3">{q.user.company || q.user.name}</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(totals(q.items, q.taxBp).total, q.currency)}</td>
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
