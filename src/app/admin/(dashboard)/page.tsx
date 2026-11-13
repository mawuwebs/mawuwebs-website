import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  FileText, Briefcase, FolderKanban, Newspaper, Mail, Plus, History, CalendarClock,
  Hourglass, PenLine, Timer, Trophy, Users, Inbox, ShieldAlert, ArrowRight, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { KpiCard } from "@/components/admin/kpi-card";
import { BarList } from "@/components/admin/bar-list";
import { TrendChart } from "@/components/admin/trend-chart";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDashboardData, getHealthChecks, getOrderSummary, parseRange, RANGES } from "@/lib/admin-stats";
import { KIND_LABEL, STATUS_OPTIONS, formatMoney, isUrgent, kindOf } from "@/lib/submission";
import { OrdersAlert } from "@/components/admin/orders-alert";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

const QUICK_ACTIONS = [
  { label: "Blog post", href: "/admin/posts/new" },
  { label: "Project", href: "/admin/projects/new" },
  { label: "Service", href: "/admin/services/new" },
  { label: "Plan", href: "/admin/plans/new" },
  { label: "Page", href: "/admin/pages/new" },
  { label: "Testimonial", href: "/admin/testimonials/new" },
  { label: "FAQ", href: "/admin/faqs/new" },
];

function formatHours(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function Attention({
  label, value, href, icon: Icon, tone,
}: { label: string; value: number; href: string; icon: typeof Mail; tone: "alert" | "warn" | "info" }) {
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
      <Icon
        className={cn(
          "size-5 shrink-0",
          !active && "text-muted-foreground",
          active && tone === "alert" && "text-destructive",
          active && tone === "warn" && "text-accent",
          active && tone === "info" && "text-primary"
        )}
      />
      <div>
        <p className="font-display text-xl leading-none font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

function Panel({
  title, action, className, children,
}: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
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

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams).range);
  const session = await auth();
  const [d, health, orders] = await Promise.all([getDashboardData(range), getHealthChecks(session?.user?.id ?? ""), getOrderSummary()]);
  const firstName = session?.user?.name?.split(" ")[0];
  const rangeLabel = `${range} days`;
  const needsAttention = orders.total + d.followUps + d.stale + d.drafts > 0;
  const funnel = STATUS_OPTIONS.map((o) => ({
    label: o.label,
    value: d.byStatus[o.value] ?? 0,
    href: `/admin/messages?status=${o.value}`,
    tone: o.value === "WON" ? ("good" as const) : o.value === "LOST" ? ("bad" as const) : ("default" as const),
  }));
  const k = d.kpis;
  const role = session?.user?.role;
  const canOrders = can(role, "orders");
  const canContent = can(role, "content");
  const canActivity = can(role, "activity");
  const canNewsletter = can(role, "newsletter");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {needsAttention ? "Here's what needs your attention today." : "You're all caught up. Nothing needs attention."}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/admin" : `/admin?range=${r}`}
              aria-current={r === range ? "true" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1 text-sm transition-colors",
                r === range ? "bg-forest text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r} days
            </Link>
          ))}
        </div>
      </div>

      {canOrders && orders.total > 0 && <OrdersAlert summary={orders} />}

      {health.length > 0 && (
        <details className="group rounded-2xl border border-accent/30 bg-accent/5 px-5 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <ShieldAlert className="size-4 text-accent" />
            {health.length} setup suggestion{health.length === 1 ? "" : "s"}
            <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <ul className="mt-3 divide-y divide-border/60">
            {health.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{h.label}</p>
                  <p className="text-xs text-muted-foreground">{h.detail}</p>
                </div>
                {h.href && (
                  <Link href={h.href} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Fix <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {canOrders && (
        <>
      <section aria-label="Needs attention" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Attention label="Follow-ups due" value={d.followUps} href="/admin/messages?follow=due" icon={CalendarClock} tone="alert" />
        <Attention label="Unanswered over 48h" value={d.stale} href="/admin/messages?status=NEW" icon={Hourglass} tone="warn" />
        <Attention label="Draft posts" value={d.drafts} href="/admin/posts?status=DRAFT" icon={PenLine} tone="info" />
      </section>

      <section aria-label={`Key numbers, last ${rangeLabel}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Enquiries"
          display={String(k.enquiries.value ?? 0)}
          href="/admin/messages"
          icon={Inbox}
          {...k.enquiries}
          rangeLabel={rangeLabel}
        />
        <KpiCard
          label="Median reply time"
          display={formatHours(k.reply.value)}
          href="/admin/messages?status=RESPONDED"
          icon={Timer}
          {...k.reply}
          lowerIsBetter
          rangeLabel={rangeLabel}
        />
        <KpiCard
          label="Won value"
          display={formatMoney(k.won.value ?? 0)}
          href="/admin/messages?status=WON"
          icon={Trophy}
          {...k.won}
          rangeLabel={rangeLabel}
        />
        <KpiCard
          label="New subscribers"
          display={String(k.subscribers.value ?? 0)}
          href="/admin/newsletter"
          icon={Users}
          {...k.subscribers}
          rangeLabel={rangeLabel}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title={`Enquiries, last ${rangeLabel}`} className="lg:col-span-2">
          <TrendChart data={d.trend} name="Enquiries" prevName="Previous period" showPrevious />
        </Panel>
        <Panel title="By type">
          <BarList items={d.byKind} emptyText={`No enquiries in the last ${rangeLabel}.`} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Pipeline"
          action={
            <span className="text-xs text-muted-foreground">
              Open quotes {formatMoney(d.openQuotes)}
              {d.winRate !== null && <> &middot; {d.winRate}% win rate</>}
            </span>
          }
        >
          <BarList items={funnel} emptyText="No enquiries yet." />
        </Panel>
        <Panel
          title="Direct contact taps"
          action={<span className="text-xs text-muted-foreground">{d.taps.total} in {rangeLabel}{d.taps.previous ? `, ${d.taps.previous} before` : ""}</span>}
        >
          <BarList items={d.taps.byChannel} emptyText={`No taps on phone, WhatsApp or email links in the last ${rangeLabel}.`} />
          {d.taps.topPages.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Most from: {d.taps.topPages.map(([p, n]) => `${p} (${n})`).join(", ")}
            </p>
          )}
        </Panel>
        <Panel title="Subscriber growth">
          <TrendChart data={d.growth} name="Confirmed subscribers" height={200} fitY />
        </Panel>
      </div>

        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canOrders && (
        <Panel
          title="Needs action"
          className="lg:col-span-2"
          action={
            <Link href="/admin/messages" className="text-sm text-accent hover:underline">
              All orders ({d.totalEnquiries})
            </Link>
          }
        >
          {d.actions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <PartyPopper className="size-8 text-success" aria-hidden />
              <p className="font-medium">Inbox zero</p>
              <p className="text-sm text-muted-foreground">No new enquiries and no follow-ups due. Nice work.</p>
            </div>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {d.actions.map((s) => {
                const overdue = s.followUpAt && isPast(s.followUpAt);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/messages?open=${s.id}`}
                      className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {KIND_LABEL[kindOf(s)]}
                          {s.quoteAmount != null && <> &middot; {formatMoney(s.quoteAmount)}</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            overdue || isUrgent(s)
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-accent/30 bg-accent/10 text-accent"
                          )}
                        >
                          {isUrgent(s) && !overdue
                            ? "Urgent, work stopped"
                            : overdue
                            ? `Follow-up due ${formatDistanceToNow(s.followUpAt!, { addSuffix: true })}`
                            : `New, waiting ${formatDistanceToNow(s.createdAt)}`}
                        </span>
                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        )}

        {canActivity && (
        <Panel
          title="Recent activity"
          action={<History className="size-4 text-muted-foreground" aria-hidden />}
        >
          <ul className="space-y-4">
            {d.activity.map((log) => (
              <li key={log.id} className="text-sm">
                <p className="text-foreground/90">{log.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {log.user?.name ?? "System"} &middot; {format(log.createdAt, "MMM d, h:mm a")}
                </p>
              </li>
            ))}
            {d.activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          </ul>
          <Link href="/admin/activity" className="mt-4 inline-block text-sm text-accent hover:underline">
            Full activity log
          </Link>
        </Panel>
        )}
      </div>

      {canContent && (
      <section aria-label="Content" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Content</h2>
          <p className="text-xs text-muted-foreground">
            {d.publishedInRange} post{d.publishedInRange === 1 ? "" : "s"} published in the last {rangeLabel}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pages" value={d.content.pages} href="/admin/pages" icon={FileText} />
          <StatCard label="Blog Posts" value={d.content.posts} href="/admin/posts" icon={Newspaper} />
          <StatCard label="Services" value={d.content.services} href="/admin/services" icon={Briefcase} />
          <StatCard label="Projects" value={d.content.projects} href="/admin/projects" icon={FolderKanban} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">Create:</span>
          {QUICK_ACTIONS.map((a) => (
            <Button key={a.href} render={<Link href={a.href} />} variant="outline" size="sm">
              <Plus className="size-4" />
              {a.label}
            </Button>
          ))}
        </div>
      </section>
      )}

      {!canOrders && !canContent && !canNewsletter && (
        <p className="text-muted-foreground">Nothing to show here for your role.</p>
      )}
    </div>
  );
}
