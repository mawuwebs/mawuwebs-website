import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { guardArea } from "@/lib/guard-area";
import { PAYMENT_METHOD_LABEL, formatMoney } from "@/lib/billing";
import { PERIODS, buildReport, resolveRange, seriesLabel } from "@/lib/billing-reports";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Billing reports" };
export const dynamic = "force-dynamic";

const fmt = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  await guardArea("billing");
  const sp = await searchParams;
  const range = resolveRange(sp.period, sp.from, sp.to);
  const report = await buildReport(range);
  const currencies = Object.entries(report);
  const q = `from=${range.fromS}&to=${range.toS}`;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/billing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Billing</Link>
          <h1 className="mt-2 font-display text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">{fmt(range.fromS)}{range.days > 1 ? ` to ${fmt(range.toS)}` : ""} · UTC dates</p>
        </div>
        <div className="flex gap-2">
          {/* File downloads, not pages. */}
          <a href={`/admin/billing/export?kind=invoices&${q}`} download className={buttonVariants({ variant: "outline", size: "sm" })}><Download className="size-4" /> Invoices CSV</a>
          <a href={`/admin/billing/export?kind=payments&${q}`} download className={buttonVariants({ variant: "outline", size: "sm" })}><Download className="size-4" /> Payments CSV</a>
        </div>
      </div>

      <div className="space-y-3">
        <nav aria-label="Report period" className="flex flex-wrap gap-1.5">
          {PERIODS.filter((p) => p.key !== "custom").map((p) => (
            <Link key={p.key} href={`/admin/billing/reports?period=${p.key}`} aria-current={range.key === p.key ? "page" : undefined}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground">
              {p.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/billing/reports" className="flex flex-wrap items-end gap-2 text-sm">
          <input type="hidden" name="period" value="custom" />
          <label className="grid gap-1 text-xs text-muted-foreground">From<input type="date" name="from" defaultValue={range.fromS} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">To<input type="date" name="to" defaultValue={range.toS} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
          <button className={buttonVariants({ variant: "outline", size: "sm" })}>Apply</button>
        </form>
      </div>

      {currencies.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No invoices or payments in this period.</div>}

      {currencies.map(([c, r]) => {
        const max = Math.max(1, ...r.series.flatMap((s) => [s.invoiced, s.collected]));
        const rate = r.invoiced > 0 ? Math.round((r.collected / r.invoiced) * 100) : null;
        return (
          <section key={c} aria-label={`${c} report`} className="space-y-4">
            {currencies.length > 1 && <h2 className="font-display text-lg font-semibold">{c}</h2>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: "Invoiced", v: formatMoney(r.invoiced, c), s: `${r.invoiceCount} invoice${r.invoiceCount === 1 ? "" : "s"}` },
                { l: "Collected", v: formatMoney(r.collected, c), s: `${r.paymentCount} payment${r.paymentCount === 1 ? "" : "s"}${rate !== null ? ` · ${rate}% of invoiced` : ""}` },
                ...(r.refunded > 0 ? [{ l: "Refunded", v: `−${formatMoney(r.refunded, c)}`, s: `Net collected ${formatMoney(r.net, c)}`, bad: true }] : []),
                { l: "Outstanding now", v: formatMoney(r.outstanding, c), s: "All sent, unpaid invoices" },
                { l: "Overdue now", v: formatMoney(r.overdue, c), s: "Past their due date", bad: r.overdue > 0 },
              ].map((k) => (
                <div key={k.l} className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">{k.l}</p>
                  <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${k.bad ? "text-destructive" : ""}`}>{k.v}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.s}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{range.bucket === "month" ? "By month" : "By day"}</h3>
                <p className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" /> Invoiced</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#f5a623]" /> Collected</span></p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <div className="flex h-44 items-end gap-1.5" style={{ minWidth: `${Math.min(r.series.length, 62) * 22}px` }} role="img" aria-label={`Invoiced and collected per ${range.bucket}`}>
                  {r.series.map((s) => (
                    <div key={s.label} className="flex h-full flex-1 flex-col justify-end gap-1" title={`${seriesLabel(s.label, range.bucket)}: invoiced ${formatMoney(s.invoiced, c)}, collected ${formatMoney(s.collected, c)}`}>
                      <div className="flex flex-1 items-end gap-px">
                        <div className="w-1/2 rounded-t bg-primary" style={{ height: `${(s.invoiced / max) * 100}%`, minHeight: s.invoiced ? 2 : 0 }} />
                        <div className="w-1/2 rounded-t bg-[#f5a623]" style={{ height: `${(s.collected / max) * 100}%`, minHeight: s.collected ? 2 : 0 }} />
                      </div>
                      <span className="truncate text-center text-[10px] text-muted-foreground">{r.series.length <= 14 || r.series.indexOf(s) % Math.ceil(r.series.length / 12) === 0 ? seriesLabel(s.label, range.bucket) : " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {r.outstanding > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">Aging of unpaid invoices <span className="font-normal text-muted-foreground">(as of today)</span></h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {[
                    { l: "Not yet due", v: r.aging.current, tone: "" },
                    { l: "1 to 30 days late", v: r.aging.d1_30, tone: "text-amber-700" },
                    { l: "31 to 60 days late", v: r.aging.d31_60, tone: "text-orange-700" },
                    { l: "Over 60 days late", v: r.aging.d61plus, tone: "text-destructive" },
                  ].map((a) => (
                    <div key={a.l} className="rounded-xl bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">{a.l}</p>
                      <p className={`mt-0.5 font-display text-lg font-bold tabular-nums ${a.v > 0 ? a.tone : "text-muted-foreground"}`}>{formatMoney(a.v, c)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">Collected by method</h3>
                {r.byMethod.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No payments.</p> : (
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {r.byMethod.map((m) => (
                      <li key={m.method}>
                        <div className="flex justify-between gap-2"><span>{PAYMENT_METHOD_LABEL[m.method] ?? m.method} <span className="text-xs text-muted-foreground">×{m.count}</span></span><span className="tabular-nums">{formatMoney(m.amount, c)}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${r.collected > 0 ? Math.max(2, Math.min(100, (m.amount / r.collected) * 100)) : 0}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">Top clients</h3>
                {r.topClients.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No activity.</p> : (
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-xs text-muted-foreground"><tr><th className="pb-1 text-left font-medium">Client</th><th className="pb-1 text-right font-medium">Invoiced</th><th className="pb-1 text-right font-medium">Paid</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {r.topClients.map((t) => <tr key={t.name}><td className="py-1.5 pr-2">{t.name}</td><td className="py-1.5 text-right tabular-nums">{formatMoney(t.invoiced, c)}</td><td className="py-1.5 text-right tabular-nums">{formatMoney(t.collected, c)}</td></tr>)}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
