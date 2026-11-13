import Link from "next/link";
import { ArrowRight, KanbanSquare } from "lucide-react";
import { getWorkDashboard } from "@/lib/work-queries";
import { getBillingSettings } from "@/lib/billing-settings";
import { formatMoney } from "@/lib/billing";
import { fmtDate } from "@/lib/portal-constants";
import { formatMinutes } from "@/lib/work";
import { cn } from "@/lib/utils";

function Flag({ label, value, tone, href }: { label: string; value: string | number; tone: "alert" | "warn" | "info"; href: string }) {
  const active = typeof value === "number" ? value > 0 : true;
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

/** Client project work on the main dashboard: what is late, what is mine, what hours are waiting to be billed. */
export async function WorkDashboard({ userId, days, canBilling }: { userId: string; days: number; canBilling: boolean }) {
  const [d, settings] = await Promise.all([getWorkDashboard(userId, days), getBillingSettings()]);
  const link = "/admin/work";
  if (d.isEmpty) {
    return (
      <section aria-label="Client work" className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-6">
        <KanbanSquare className="size-6 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold">Client work is ready</h2>
          <p className="text-sm text-muted-foreground">Add a project to a client, then break it into tasks and log time. Progress, late work and unbilled hours will show up here.</p>
        </div>
        <Link href="/admin/clients" className="text-sm text-accent hover:underline">Go to clients</Link>
      </section>
    );
  }
  return (
    <section aria-label="Client work" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Client work</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/admin/work/calendar" className="text-muted-foreground hover:text-foreground hover:underline">Calendar</Link>
          <Link href="/admin/work/timesheet" className="text-muted-foreground hover:text-foreground hover:underline">Timesheet</Link>
          <Link href={link} className="inline-flex items-center gap-1 text-accent hover:underline">All projects <ArrowRight className="size-3.5" /></Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Flag label="Tasks overdue" value={d.overdue} tone="alert" href={link} />
        <Flag label="Tasks due in 7 days" value={d.dueSoon} tone="warn" href={link} />
        <Flag label="Open tasks" value={d.openTasks} tone="info" href={link} />
        <Flag label={`Tasks done, ${days} days`} value={d.doneInRange} tone="info" href={link} />
        {canBilling
          ? <Flag label={`Unbilled time${d.unbilledMinutes ? ` (${formatMinutes(d.unbilledMinutes)})` : ""}`} value={d.unbilledAmount > 0 ? formatMoney(d.unbilledAmount, settings.defaultCurrency) : 0} tone="warn" href={link} />
          : <Flag label={`Hours logged, ${days} days`} value={formatMinutes(d.minutesInRange)} tone="info" href={link} />}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Flag label="Client requests to triage" value={d.clientRequests} tone="alert" href={link} />
        <Flag label="Milestones waiting for client approval" value={d.awaitingApproval} tone="warn" href={link} />
        <Flag label="Projects near or over hours budget" value={d.overBudget} tone="warn" href={link} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Projects needing attention</h3>
          {d.atRisk.length === 0 ? <p className="text-sm text-muted-foreground">{d.totalProjects} active, none late or idle.</p> : (
            <ul className="divide-y divide-border">
              {d.atRisk.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/work/${p.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5 text-sm hover:text-accent">
                    <span><span className="font-medium">{p.title}</span> <span className="text-muted-foreground">· {p.client.company || p.client.name}</span></span>
                    <span className={cn("text-xs", p.health === "late" ? "text-destructive" : "text-muted-foreground")}>
                      {p.health === "late" ? (p.overdueTasks ? `${p.overdueTasks} task${p.overdueTasks === 1 ? "" : "s"} overdue` : "Past its due date") : p.health === "budget" ? "Hours budget nearly used" : "No activity for 2 weeks"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-3 font-display text-base font-semibold">My tasks</h3>
          {d.mine.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is assigned to you.</p> : (
            <ul className="divide-y divide-border">
              {d.mine.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/work/${t.project.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5 text-sm hover:text-accent">
                    <span><span className="font-medium">{t.title}</span> <span className="text-muted-foreground">· {t.project.title}</span></span>
                    <span className={cn("text-xs", t.overdue ? "text-destructive" : "text-muted-foreground")}>{t.dueDate ? `${t.overdue ? "overdue " : "due "}${fmtDate(t.dueDate)}` : "no date"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
