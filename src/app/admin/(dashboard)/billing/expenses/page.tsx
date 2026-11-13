import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Download, Plus, Receipt, Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { formatMoney, minorToInput } from "@/lib/billing";
import { resolveRange, PERIODS } from "@/lib/billing-range";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/expenses";
import { ExpenseForm, ExpenseRowActions, RecurringExpenseActions, RecurringExpenseForm, RestoreExpenseButton } from "@/components/admin/expense-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const day = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const chip = "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";
const EVERY: Record<number, string> = { 1: "Monthly", 3: "Quarterly", 6: "Every 6 months", 12: "Yearly", 24: "Every 2 years" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string; cat?: string; p?: string; view?: string }> }) {
  await guardArea("billing");
  const sp = await searchParams;
  const range = resolveRange(sp.period ?? "year", sp.from, sp.to);
  const cat = (EXPENSE_CATEGORIES as readonly string[]).includes(sp.cat ?? "") ? sp.cat! : "";
  const deleted = sp.view === "deleted";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(sp.p ?? "1", 10) || 1));
  const where = { spentAt: { gte: range.from, lt: range.to }, deletedAt: deleted ? { not: null } : null, ...(cat ? { category: cat } : {}) };

  const [expenses, total, sums, projects, recurring] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { spentAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { project: { select: { title: true } }, invoice: { select: { number: true } } } }),
    prisma.expense.count({ where }),
    // Totals cover the whole period, not just the page on screen.
    prisma.expense.groupBy({ by: ["currency", "category"], where, _sum: { amount: true, taxAmount: true }, _count: { _all: true } }),
    prisma.clientProject.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true, user: { select: { name: true, company: true } } } }),
    prisma.recurringExpense.findMany({ orderBy: [{ active: "desc" }, { nextRunAt: "asc" }] }),
  ]);
  const projectOpts = projects.map((p) => ({ id: p.id, title: p.title, client: p.user.company || p.user.name }));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currencies = [...new Set(sums.map((s) => s.currency))].sort();
  const q = `from=${range.fromS}&to=${range.toS}`;
  const href = (over: { period?: string; cat?: string; p?: number; view?: string }) => {
    const p = new URLSearchParams();
    p.set("period", over.period ?? range.key);
    if (range.key === "custom" && !over.period) { p.set("from", range.fromS); p.set("to", range.toS); }
    const c = over.cat ?? cat;
    if (c) p.set("cat", c);
    const v = over.view ?? (deleted ? "deleted" : "");
    if (v) p.set("view", v);
    if ((over.p ?? 1) > 1) p.set("p", String(over.p));
    return `/admin/billing/expenses?${p}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/billing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Billing</Link>
          <h1 className="mt-2 font-display text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">{fmt(range.fromS)}{range.days > 1 ? ` to ${fmt(range.toS)}` : ""} · UTC dates</p>
        </div>
        <a href={`/admin/billing/export?kind=expenses&${q}`} download className={buttonVariants({ variant: "outline", size: "sm" })}><Download className="size-4" /> Expenses CSV</a>
      </div>

      <details className="group rounded-2xl border border-border bg-card" open={expenses.length === 0 && !deleted}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plus className="size-4" /></span> Record an expense</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-border p-5"><ExpenseForm projects={projectOpts} /></div>
      </details>

      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Repeat className="size-4 text-muted-foreground" /> Recurring expenses <span className="font-normal text-muted-foreground">({recurring.length})</span></span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-5 border-t border-border p-5">
          {recurring.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="pb-2 font-medium">Expense</th><th className="pb-2 font-medium">Repeats</th><th className="pb-2 font-medium">Next due</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody className="divide-y divide-border">
                  {recurring.map((r) => (
                    <tr key={r.id} className={r.active ? "" : "opacity-60"}>
                      <td className="py-2 pr-3"><div className="font-medium">{r.description}</div><div className="text-xs text-muted-foreground">{[r.vendor, EXPENSE_CATEGORY_LABEL[r.category], r.autoRecord ? "recorded automatically" : "reminder only"].filter(Boolean).join(" · ")}</div></td>
                      <td className="py-2 pr-3">{EVERY[r.intervalMonths] ?? `Every ${r.intervalMonths} months`}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.active ? fmt(day(r.nextRunAt)) : <Badge variant="outline">Paused</Badge>}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.amount, r.currency)}</td>
                      <td className="py-2"><RecurringExpenseActions id={r.id} active={r.active} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <RecurringExpenseForm />
        </div>
      </details>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <nav aria-label="Period" className="flex flex-wrap gap-1.5">
          {PERIODS.filter((p) => p.key !== "custom").map((p) => <Link key={p.key} href={href({ period: p.key })} aria-current={range.key === p.key ? "page" : undefined} className={chip}>{p.label}</Link>)}
        </nav>
        <form action="/admin/billing/expenses" className="flex flex-wrap items-end gap-2 text-sm">
          <input type="hidden" name="period" value="custom" />
          {cat && <input type="hidden" name="cat" value={cat} />}
          {deleted && <input type="hidden" name="view" value="deleted" />}
          <label className="grid gap-1 text-xs text-muted-foreground">From<input type="date" name="from" defaultValue={range.fromS} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">To<input type="date" name="to" defaultValue={range.toS} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
          <button className={buttonVariants({ variant: "outline", size: "sm" })}>Apply</button>
        </form>
        <nav aria-label="Category" className="flex flex-wrap gap-1.5">
          <Link href={href({ cat: "" })} aria-current={!cat ? "page" : undefined} className={chip}>All categories</Link>
          {EXPENSE_CATEGORIES.map((c) => <Link key={c} href={href({ cat: c })} aria-current={cat === c ? "page" : undefined} className={chip}>{EXPENSE_CATEGORY_LABEL[c]}</Link>)}
          <Link href={href({ view: deleted ? "active" : "deleted" })} aria-current={deleted ? "page" : undefined} className={`${chip} ml-auto`}>{deleted ? "Back to expenses" : "Deleted"}</Link>
        </nav>
      </div>

      {deleted && <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Showing deleted expenses. They are left out of reports and exports until restored.</p>}

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"><Receipt className="size-6" aria-hidden /><p>{deleted ? "Nothing deleted in this period." : cat ? "No expenses in this category for this period." : "No expenses in this period. Record one above or pick a wider period."}</p></div>
      ) : (
        <>
          {!deleted && currencies.map((c) => {
            const rows = sums.filter((s) => s.currency === c).map((s) => ({ category: s.category, amount: s._sum.amount ?? 0, tax: s._sum.taxAmount ?? 0, count: s._count._all })).sort((a, b) => b.amount - a.amount);
            const spent = rows.reduce((n, r) => n + r.amount, 0);
            const tax = rows.reduce((n, r) => n + r.tax, 0);
            const count = rows.reduce((n, r) => n + r.count, 0);
            return (
              <section key={c} aria-label={`${c} spending`} className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total spent ({c})</p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatMoney(spent, c)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count} expense{count === 1 ? "" : "s"}{tax > 0 ? ` · ${formatMoney(tax, c)} is input tax` : ""}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
                  <h3 className="text-sm font-semibold">By category</h3>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {rows.map((x) => (
                      <li key={x.category}>
                        <div className="flex justify-between gap-2"><span>{EXPENSE_CATEGORY_LABEL[x.category] ?? x.category} <span className="text-xs text-muted-foreground">×{x.count}</span></span><span className="tabular-nums">{formatMoney(x.amount, c)}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${spent > 0 ? Math.max(2, Math.min(100, (x.amount / spent) * 100)) : 0}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Expense</th><th className="p-3 font-medium">Category</th><th className="p-3 text-right font-medium">Amount</th><th className="p-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="align-top transition-colors hover:bg-secondary/40 even:bg-secondary/10">
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(day(e.spentAt))}</td>
                    <td className="p-3">
                      <div className="font-medium">{e.description}</div>
                      <div className="text-xs text-muted-foreground">{[e.vendor, e.project?.title, e.reference, e.source === "gateway" ? "gateway fee" : e.source === "recurring" ? "recurring" : ""].filter(Boolean).join(" · ")}</div>
                      {e.billable && <Badge variant="outline" className="mt-1 text-[10px]">{e.invoice ? `Billed on ${e.invoice.number}` : "Bill to client"}</Badge>}
                    </td>
                    <td className="p-3"><Badge variant="secondary" className="font-normal">{EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}</Badge></td>
                    <td className="p-3 text-right font-medium tabular-nums">{formatMoney(e.amount, e.currency)}{e.taxAmount > 0 && <div className="text-xs font-normal text-muted-foreground">incl. {formatMoney(e.taxAmount, e.currency)} tax</div>}</td>
                    <td className="p-3 text-right">
                      {deleted ? <RestoreExpenseButton id={e.id} /> : (
                        <ExpenseRowActions
                          projects={projectOpts} hasReceipt={!!e.receiptFile} locked={!!e.invoiceId}
                          expense={{ id: e.id, description: e.description, vendor: e.vendor, category: e.category, amount: minorToInput(e.amount), taxAmount: e.taxAmount ? minorToInput(e.taxAmount) : "", currency: e.currency, method: e.method, reference: e.reference, note: e.note, projectId: e.projectId ?? "", billable: e.billable, spentAt: day(e.spentAt) }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted-foreground">
              {page > 1 ? <Link href={href({ p: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link> : <span />}
              <span>Page {page} of {pages}</span>
              {page < pages ? <Link href={href({ p: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
