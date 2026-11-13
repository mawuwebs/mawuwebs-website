import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, KanbanSquare, LayoutTemplate } from "lucide-react";
import { guardArea } from "@/lib/guard-area";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getMyTasks, getWorkProjects } from "@/lib/work-queries";
import { PROJECT_STATUS_LABEL, formatMoney } from "@/lib/billing";
import { fmtDate } from "@/lib/portal-constants";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, formatMinutes } from "@/lib/work";
import { getBillingSettings } from "@/lib/billing-settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Client work" };

const HEALTH = { ok: null, late: { text: "Late", cls: "bg-destructive/10 text-destructive", bar: "bg-destructive" }, budget: { text: "Hours budget nearly used", cls: "bg-accent/15 text-accent-foreground", bar: "bg-accent" }, idle: { text: "No activity for 2 weeks", cls: "bg-accent/15 text-accent-foreground", bar: "bg-accent" } } as const;
const STATUS_DOT: Record<string, string> = { TODO: "bg-muted-foreground/40", DOING: "bg-primary", REVIEW: "bg-accent", DONE: "bg-success" };
const chip = "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "alert" | "warn" }) {
  const on = typeof value === "number" ? value > 0 : true;
  return (
    <div className={cn("rounded-2xl border bg-card p-4", on && tone === "alert" ? "border-destructive/30 bg-destructive/5" : on && tone === "warn" ? "border-accent/40 bg-accent/5" : "border-border")}>
      <p className="font-display text-2xl leading-none font-bold tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ show?: string; filter?: string }> }) {
  await guardArea("orders");
  const sp = await searchParams;
  const showAll = sp.show === "all";
  const attention = sp.filter === "attention";
  const session = await auth();
  const [all, mine, settings] = await Promise.all([getWorkProjects({ includeDone: showAll }), getMyTasks(session!.user.id), getBillingSettings()]);
  const canBill = can(session?.user?.role, "billing");
  const projects = attention ? all.filter((p) => p.health !== "ok" || p.overdueTasks > 0) : all;
  const openTasks = all.reduce((n, p) => n + (p.progress.total - p.progress.done), 0);
  const overdue = all.reduce((n, p) => n + p.overdueTasks, 0);
  const attentionCount = all.filter((p) => p.health !== "ok" || p.overdueTasks > 0).length;
  const unbilled = all.reduce((n, p) => n + p.unbilledAmount, 0);
  const href = (o: { show?: string; filter?: string }) => {
    const q = new URLSearchParams();
    const show = o.show ?? (showAll ? "all" : "");
    const filter = o.filter ?? (attention ? "attention" : "");
    if (show) q.set("show", show);
    if (filter) q.set("filter", filter);
    return `/admin/work${q.size ? `?${q}` : ""}`;
  };
  const nav = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-secondary";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Client work</h1>
          <p className="mt-1 text-muted-foreground">Every active project, its tasks, hours and what is ready to bill.</p>
        </div>
        <nav aria-label="Work tools" className="flex flex-wrap gap-2">
          <Link href="/admin/work/calendar" className={nav}><CalendarDays className="size-4 text-muted-foreground" /> Calendar</Link>
          <Link href="/admin/work/timesheet" className={nav}><Clock className="size-4 text-muted-foreground" /> Timesheet</Link>
          <Link href="/admin/work/templates" className={nav}><LayoutTemplate className="size-4 text-muted-foreground" /> Templates</Link>
        </nav>
      </div>

      <section aria-label="Summary" className={cn("grid grid-cols-2 gap-3", canBill ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <Stat label="Active projects" value={all.length} />
        <Stat label="Open tasks" value={openTasks} />
        <Stat label="Overdue tasks" value={overdue} tone="alert" />
        {canBill && <Stat label="Unbilled time" value={unbilled > 0 ? formatMoney(unbilled, settings.defaultCurrency) : 0} tone="warn" />}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">My tasks <span className="text-sm font-normal text-muted-foreground">({mine.length})</span></h2>
        </div>
        {mine.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success" aria-hidden /> Nothing is assigned to you. You are all caught up.</div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {mine.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/work/${t.project.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3.5 text-sm transition-colors hover:bg-secondary/60">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[t.status])} aria-hidden />
                    <span className="min-w-0"><span className="font-medium">{t.title}</span> <span className="text-muted-foreground">· {t.project.title} ({t.project.user.company || t.project.user.name})</span></span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{TASK_STATUS_LABEL[t.status]}</span>
                    {t.priority === 2 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">High</span>}
                    {t.priority === 0 && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{PRIORITY_LABEL[0]}</span>}
                    {t.dueDate && <span className={cn("rounded-full px-2 py-0.5", t.overdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground")}>{t.overdue ? "Was due" : "Due"} {fmtDate(t.dueDate)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Projects <span className="text-sm font-normal text-muted-foreground">({projects.length})</span></h2>
          <nav aria-label="Project filters" className="flex flex-wrap gap-1.5">
            <Link href={href({ filter: "" })} aria-current={!attention ? "page" : undefined} className={chip}>All</Link>
            <Link href={href({ filter: "attention" })} aria-current={attention ? "page" : undefined} className={chip}>Needs attention{attentionCount > 0 ? ` (${attentionCount})` : ""}</Link>
            <Link href={href({ show: showAll ? "" : "all" })} aria-current={showAll ? "page" : undefined} className={chip}>Include finished</Link>
          </nav>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <KanbanSquare className="size-6" aria-hidden />
            {attention ? <p>Nothing needs attention. Every project is on track.</p> : <p>No active projects. Add one from a <Link href="/admin/clients" className="text-accent hover:underline">client page</Link>.</p>}
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {projects.map((p) => {
              const h = HEALTH[p.health];
              const late = p.overdueTasks > 0;
              return (
                <li key={p.id}>
                  <Link href={`/admin/work/${p.id}`} className="group relative block h-full space-y-3.5 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10">
                    <span className={cn("absolute inset-y-0 left-0 w-1", h ? h.bar : "bg-primary/20")} aria-hidden />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-lg leading-snug font-semibold group-hover:text-accent">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.client.company || p.client.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {h && <span className={cn("rounded-full px-2 py-0.5", h.cls)}>{h.text}</span>}
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                        <span>{p.progress.total === 0 ? "No tasks yet" : `${p.progress.done} of ${p.progress.total} tasks done`}</span>
                        <span className="font-medium tabular-nums text-foreground">{p.progress.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={p.progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.title} progress`}>
                        <div className={cn("h-full rounded-full", late ? "bg-destructive" : "bg-primary")} style={{ width: `${p.progress.pct}%` }} />
                      </div>
                    </div>
                    <dl className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs">
                      <div className="flex gap-1"><dt className="text-muted-foreground">Logged</dt><dd className="font-medium">{formatMinutes(p.minutes)}</dd></div>
                      {p.dueDate && <div className="flex gap-1"><dt className="text-muted-foreground">Due</dt><dd className="font-medium">{fmtDate(p.dueDate)}</dd></div>}
                      {late && <div className="flex gap-1"><dt className="sr-only">Overdue</dt><dd className="font-medium text-destructive">{p.overdueTasks} overdue</dd></div>}
                      {canBill && p.unbilledAmount > 0 && <div className="flex gap-1"><dt className="text-muted-foreground">Unbilled</dt><dd className="font-medium">{formatMinutes(p.unbilledMinutes)} ({formatMoney(p.unbilledAmount, settings.defaultCurrency)})</dd></div>}
                    </dl>
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
