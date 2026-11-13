import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate } from "@/lib/portal";
import { daysFromNow } from "@/lib/portal-constants";
import { balanceDue, formatMoney, isOverdue, totals, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import { outstandingByCurrency } from "@/lib/billing-queries";
import { BarChart3, Banknote, Search, FileText, Receipt, Settings2, Download, Plus, Wallet, AlertTriangle } from "lucide-react";
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

const QUOTE_FILTERS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "SENT", label: "Awaiting reply" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "DECLINED", label: "Declined" },
] as const;

const chip = "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

const PAGE_SIZE = 25;

function Pager({ page, pages, prev, next }: { page: number; pages: number; prev: string; next: string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      {page > 1 ? <Link href={prev} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link> : <span />}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link href={next} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link> : <span />}
    </nav>
  );
}
const pageNum = (v: string | undefined) => Math.max(1, Math.min(10_000, Number.parseInt(v ?? "1", 10) || 1));

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string; qs?: string; q?: string; ip?: string; qp?: string }> }) {
  await guardArea("billing");
  const sp = await searchParams;
  const status = FILTERS.some((f) => f.key === sp.status) ? sp.status! : "all";
  const qStatus = QUOTE_FILTERS.some((f) => f.key === sp.qs) ? sp.qs! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const ip = pageNum(sp.ip);
  const qp = pageNum(sp.qp);
  const href = (over: { status?: string; qs?: string; q?: string; ip?: number; qp?: number }) => {
    const p = new URLSearchParams();
    const st = over.status ?? status, qs = over.qs ?? qStatus;
    if (st !== "all") p.set("status", st);
    if (qs !== "all") p.set("qs", qs);
    const qq = over.q ?? q;
    if (qq) p.set("q", qq);
    // Changing a filter or the search starts that list from page 1; otherwise keep the page.
    const i = over.ip ?? (over.status !== undefined || over.q !== undefined ? 1 : ip);
    const k = over.qp ?? (over.qs !== undefined || over.q !== undefined ? 1 : qp);
    if (i > 1) p.set("ip", String(i));
    if (k > 1) p.set("qp", String(k));
    const str = p.toString();
    return `/admin/billing${str ? `?${str}` : ""}`;
  };
  const search = q
    ? { OR: [{ number: { contains: q } }, { title: { contains: q } }, { user: { name: { contains: q } } }, { user: { company: { contains: q } } }] }
    : {};
  // Filters run in SQL so counts and pages stay right however many documents exist. Overdue = sent and past its due date.
  const now = daysFromNow(0);
  const invoiceFilter = (key: string) =>
    key === "draft" ? { status: "DRAFT" as const }
    : key === "open" ? { status: "SENT" as const }
    : key === "overdue" ? { status: "SENT" as const, dueDate: { lt: now } }
    : key === "paid" ? { status: "PAID" as const }
    : {};
  const quoteWhere = { ...search, ...(qStatus !== "all" ? { status: qStatus as "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" } : {}) };
  const [outstanding, quotes, quoteTotal, invoices, ...invoiceCounts] = await Promise.all([
    outstandingByCurrency(),
    prisma.quote.findMany({ where: quoteWhere, orderBy: { createdAt: "desc" }, skip: (qp - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { items: true, user: { select: { name: true, company: true } } } }),
    prisma.quote.count({ where: quoteWhere }),
    prisma.invoice.findMany({ where: { ...search, ...invoiceFilter(status) }, orderBy: { createdAt: "desc" }, skip: (ip - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { items: true, payments: true, user: { select: { name: true, company: true } } } }),
    ...FILTERS.map((f) => prisma.invoice.count({ where: { ...search, ...invoiceFilter(f.key) } })),
  ]);
  const currencies = Object.entries(outstanding);
  const rows = invoices.map((i) => {
    const total = totals(i.items, i.taxBp).total;
    const bal = i.status === "SENT" ? balanceDue(total, i.payments) : 0;
    return { i, total, bal, overdue: isOverdue(i, bal) };
  });
  const counts: Record<string, number> = Object.fromEntries(FILTERS.map((f, n) => [f.key, invoiceCounts[n]]));
  const shown = rows;
  const invoicePages = Math.max(1, Math.ceil(counts[status] / PAGE_SIZE));
  const quotePages = Math.max(1, Math.ceil(quoteTotal / PAGE_SIZE));
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Quotes, invoices and payments in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/billing/expenses" className={buttonVariants({ variant: "ghost", size: "sm" })}><Banknote className="size-4" /> Expenses</Link>
          <Link href="/admin/billing/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}><BarChart3 className="size-4" /> Reports</Link>
          <Link href="/admin/billing/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}><Settings2 className="size-4" /> Settings</Link>
          <details className="group relative">
            <summary className={`${buttonVariants({ variant: "ghost", size: "sm" })} cursor-pointer list-none`}><Download className="size-4" /> Export</summary>
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-border bg-popover p-1 text-sm shadow-lg">
              {/* File downloads, not pages: plain links are correct. */}
              <a href="/admin/billing/export?kind=invoices" download className="block rounded-lg px-3 py-2 hover:bg-secondary">Invoices (CSV)</a>
              <a href="/admin/billing/export?kind=payments" download className="block rounded-lg px-3 py-2 hover:bg-secondary">Payments (CSV)</a>
              <a href="/admin/billing/export?kind=expenses" download className="block rounded-lg px-3 py-2 hover:bg-secondary">Expenses (CSV)</a>
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

      <form action="/admin/billing" role="search" className="flex max-w-md items-center gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        {qStatus !== "all" && <input type="hidden" name="qs" value={qStatus} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" name="q" defaultValue={q} placeholder="Search number, title or client" aria-label="Search invoices and quotes" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
        </div>
        <button className={buttonVariants({ variant: "outline", size: "sm" })}>Search</button>
        {q && <Link href={href({ q: "" })} className={buttonVariants({ variant: "ghost", size: "sm" })}>Clear</Link>}
      </form>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Receipt className="size-5 text-muted-foreground" /> Invoices</h2>
          <nav aria-label="Filter invoices" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link key={f.key} href={href({ status: f.key })} aria-current={status === f.key || (f.key === "all" && !FILTERS.some((x) => x.key === status)) ? "page" : undefined}
                className={chip}>
                {f.label} <span className="tabular-nums opacity-70">{counts[f.key]}</span>
              </Link>
            ))}
          </nav>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">{rows.length === 0 && !q && status === "all" ? "No invoices yet." : "No invoices match."}</p>
            {rows.length === 0 && !q && status === "all" && <Link href="/admin/billing/invoices/new" className={`${buttonVariants({ size: "sm" })} mt-3`}><Plus className="size-4" /> Create your first invoice</Link>}
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
        <Pager page={ip} pages={invoicePages} prev={href({ ip: ip - 1 })} next={href({ ip: ip + 1 })} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="size-5 text-muted-foreground" /> Quotes</h2>
          <nav aria-label="Filter quotes" className="flex flex-wrap gap-1.5">
            {QUOTE_FILTERS.map((f) => <Link key={f.key} href={href({ qs: f.key })} aria-current={qStatus === f.key ? "page" : undefined} className={chip}>{f.label}</Link>)}
          </nav>
        </div>
        {quotes.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{q || qStatus !== "all" ? "No quotes match." : "No quotes yet."}</div> : (
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
        <Pager page={qp} pages={quotePages} prev={href({ qp: qp - 1 })} next={href({ qp: qp + 1 })} />
      </section>
    </div>
  );
}
