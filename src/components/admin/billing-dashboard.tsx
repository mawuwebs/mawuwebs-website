import Link from "next/link";
import { format } from "date-fns";
import { AlarmClock, ArrowRight, CalendarClock, FilePlus2, FileText, Mail, Receipt, Repeat, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarList } from "@/components/admin/bar-list";
import { TrendChart } from "@/components/admin/trend-chart";
import { BillingSnapshot } from "@/components/admin/billing-snapshot";
import { getBillingDashboard } from "@/lib/billing-dashboard";
import { formatMoney } from "@/lib/billing";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { label: "New invoice", href: "/admin/billing/invoices/new", icon: Receipt },
  { label: "New quote", href: "/admin/billing/quotes/new", icon: FileText },
  { label: "New client", href: "/admin/clients", icon: UserPlus },
];

function Flag({ label, value, tone, href }: { label: string; value: number; tone: "alert" | "warn" | "info"; href: string }) {
  const active = value > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-secondary/60",
        active && tone === "alert" && "border-destructive/30 bg-destructive/5",
        active && tone === "warn" && "border-accent/30 bg-accent/5",
        !active && "border-border bg-card"
      )}
    >
      <p className={cn("font-display text-xl leading-none font-bold tabular-nums", !active && "text-muted-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function Panel({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Billing and clients on the main dashboard: what needs chasing, money in over time, pipeline to cash, top clients, what runs next. */
export async function BillingDashboard({ days }: { days: number }) {
  const d = await getBillingDashboard(days);
  const rangeLabel = `${days} days`;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Billing:</span>
      {ACTIONS.map((a) => (
        <Button key={a.href} render={<Link href={a.href} />} variant="outline" size="sm">
          <a.icon className="size-4" />
          {a.label}
        </Button>
      ))}
    </div>
  );

  if (d.isEmpty) {
    return (
      <section aria-label="Billing" className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-6">
        <FilePlus2 className="size-6 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold">Billing is set up and waiting</h2>
          <p className="text-sm text-muted-foreground">Send your first quote or invoice and the money, overdue and client numbers will show up here.</p>
        </div>
        {actions}
      </section>
    );
  }

  const a = d.attention;
  const f = d.funnel;
  const funnel = [
    { label: "Enquiries", value: f.enquiries, href: "/admin/messages" },
    { label: "Quotes sent", value: f.quotesSent, href: "/admin/billing" },
    { label: "Quotes accepted", value: f.quotesAccepted, href: "/admin/billing", tone: "good" as const },
    { label: "Invoices issued", value: f.invoicesIssued, href: "/admin/billing" },
    { label: "Invoices paid", value: f.invoicesPaid, href: "/admin/billing", tone: "good" as const },
  ];
  const u = d.upcoming;
  const reminders = u.soonReminders + u.lateReminders;

  return (
    <div className="space-y-6">
      {actions}
      <BillingSnapshot />

      <section aria-label="Billing needs attention" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Flag label="Invoices overdue" value={a.overdue} tone="alert" href="/admin/billing" />
        <Flag label="Invoices due in 7 days" value={a.dueSoon} tone="warn" href="/admin/billing" />
        <Flag label="Quotes expiring in 7 days" value={a.expiring} tone="warn" href="/admin/billing" />
        <Flag label="Accepted, not invoiced" value={a.acceptedNoInvoice} tone="alert" href="/admin/billing" />
        <Flag label="Draft invoices" value={a.drafts} tone="info" href="/admin/billing" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={`Money received, last ${rangeLabel}`}
          className="lg:col-span-2"
          action={<Link href="/admin/billing/reports" className="text-sm text-accent hover:underline">Reports</Link>}
        >
          {d.trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments in the last {rangeLabel}.</p>
          ) : (
            <div className="space-y-6">
              {d.trends.map((t) => (
                <div key={t.currency}>
                  <p className="mb-2 text-sm text-muted-foreground">
                    {t.currency}: <span className="font-medium text-foreground tabular-nums">{formatMoney(t.total, t.currency)}</span>
                    {t.previousTotal > 0 && <> vs {formatMoney(t.previousTotal, t.currency)} before</>}
                  </p>
                  <TrendChart data={t.points} name={`Received (${t.currency})`} showPrevious currency={t.currency} height={200} />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Enquiry to cash" action={<span className="text-xs text-muted-foreground">{f.won} enquiries won</span>}>
          <BarList items={funnel} emptyText={`No quotes or invoices in the last ${rangeLabel}.`} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Clients"
          action={
            <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              All clients <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <div className="mb-4 flex items-baseline gap-4">
            <p className="font-display text-2xl font-bold tabular-nums">{d.clients.total}</p>
            <p className="text-sm text-muted-foreground">
              active{d.clients.added > 0 ? `, ${d.clients.added} new in ${rangeLabel}` : ""}
            </p>
          </div>
          {d.clients.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client payments in the last {rangeLabel}.</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">Top by money received ({d.clients.topCurrency})</p>
              <ol className="divide-y divide-border">
                {d.clients.top.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatMoney(c.amount, d.clients.topCurrency!)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>

        <Panel
          title="Coming up"
          className="lg:col-span-2"
          action={<Link href="/admin/billing" className="text-sm text-accent hover:underline">Billing</Link>}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Repeat className="size-4 text-muted-foreground" aria-hidden /> Recurring invoices, next 30 days
              </h3>
              {u.recurring.length === 0 ? (
                <p className="text-sm text-muted-foreground">None scheduled.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {u.recurring.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">{r.client}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.title} &middot; {r.autoSend ? "emails automatically" : "draft only"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium tabular-nums">{formatMoney(r.amount, r.currency)}</span>
                        <span className="block text-xs text-muted-foreground">
                          <CalendarClock className="mr-1 inline size-3" aria-hidden />
                          {format(r.at, "MMM d")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {u.recurringTotal > u.recurring.length && (
                <p className="mt-2 text-xs text-muted-foreground">and {u.recurringTotal - u.recurring.length} more</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlarmClock className="size-4 text-muted-foreground" aria-hidden /> Reminders on the next run
              </h3>
              {!u.remindersEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Reminders are switched off. <Link href="/admin/billing/settings" className="text-accent hover:underline">Turn on</Link>
                </p>
              ) : reminders === 0 ? (
                <p className="text-sm text-muted-foreground">No client reminders waiting.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {u.soonReminders > 0 && (
                    <li className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" aria-hidden />
                      {u.soonReminders} &ldquo;due soon&rdquo; note{u.soonReminders === 1 ? "" : "s"}
                    </li>
                  )}
                  {u.lateReminders > 0 && (
                    <li className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" aria-hidden />
                      {u.lateReminders} overdue reminder{u.lateReminders === 1 ? "" : "s"}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
