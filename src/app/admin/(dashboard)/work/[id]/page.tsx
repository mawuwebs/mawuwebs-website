import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, Inbox, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PROJECT_STATUS_LABEL, formatMoney, minorToInput, subtotal, totals, amountPaid } from "@/lib/billing";
import { fmtDate, ticketRef } from "@/lib/portal-constants";
import { getBillingSettings } from "@/lib/billing-settings";
import {
  MILESTONE_STATE_LABEL, TASK_STATUSES, TASK_STATUS_LABEL, budgetState, formatMinutes, milestoneIsFinished, milestoneState, profitability, progressOf, taskIsOverdue, timeAmount,
} from "@/lib/work";
import {
  ApplyTemplateForm, DeleteEntryButton, DeleteFileButton, DeleteTaskButton, EMPTY_MILESTONE, EMPTY_TASK, InvoiceTimeButton, LogTimeForm, MilestoneActions, MilestoneForm,
  ProjectFileForm, StaffCommentForm, TaskForm, TaskStatusSelect, TermsForm,
} from "@/components/admin/work-forms";
import { cn } from "@/lib/utils";

const COL_DOT: Record<string, string> = { TODO: "bg-muted-foreground/40", DOING: "bg-primary", REVIEW: "bg-accent", DONE: "bg-success" };
const SECTIONS = [["milestones", "Milestones"], ["tasks", "Tasks"], ["time", "Time and budget"], ["conversation", "Conversation"], ["files", "Files"]] as const;
const summary = "flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden";

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className={summary}>
        <span className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><Plus className="size-3.5" /></span>{title}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border p-4 sm:p-5">{children}</div>
    </details>
  );
}

export const metadata: Metadata = { title: "Project work" };

export default async function ProjectWorkPage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("orders");
  const { id } = await params;
  const session = await auth();
  const canBill = can(session?.user?.role, "billing");
  const [project, staff, settings, templates] = await Promise.all([
    prisma.clientProject.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, company: true } },
        milestoneRows: { orderBy: { position: "asc" } },
        tasks: { orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }], include: { assignee: { select: { name: true } }, milestone: { select: { title: true } } } },
        timeEntries: { orderBy: { workedOn: "desc" }, take: 200, include: { user: { select: { name: true } }, task: { select: { title: true } }, invoice: { select: { id: true, number: true } } } },
        comments: { orderBy: { createdAt: "desc" }, take: 50 },
        files: { orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { updatedAt: "desc" }, select: { id: true, subject: true, status: true, tasks: { select: { id: true }, take: 1 } } },
        invoices: { where: { status: { in: ["SENT", "PAID"] } }, include: { items: true, payments: true } },
        expenses: { select: { amount: true, currency: true } },
      },
    }),
    prisma.user.findMany({ where: { role: { not: "CLIENT" }, disabledAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getBillingSettings(),
    prisma.projectTemplate.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const now = new Date();
  const progress = progressOf(project.tasks);
  const cur = settings.defaultCurrency;
  const unbilled = project.timeEntries.filter((e) => e.billable && !e.invoiceId && e.rateMinor > 0);
  const unbilledMin = unbilled.reduce((n, e) => n + e.minutes, 0);
  const unbilledAmt = unbilled.reduce((n, e) => n + timeAmount(e.minutes, e.rateMinor), 0);
  const totalMin = project.timeEntries.reduce((n, e) => n + e.minutes, 0);
  const budget = budgetState(totalMin, project.budgetMinutes);
  const staffOptions = staff;
  const milestoneOptions = project.milestoneRows.map((m) => ({ id: m.id, title: m.title }));
  const triage = project.tasks.filter((t) => t.fromClient && !t.assigneeId && t.status !== "DONE");

  // Money, in the default currency only.
  const invs = project.invoices.filter((i) => i.currency === cur);
  const invoicedNet = invs.reduce((n, i) => n + subtotal(i.items), 0);
  const invoicedGross = invs.reduce((n, i) => n + totals(i.items, i.taxBp).total, 0);
  const collected = invs.reduce((n, i) => n + amountPaid(i.payments), 0);
  const expensesTotal = project.expenses.filter((e) => e.currency === cur).reduce((n, e) => n + e.amount, 0);
  const money = profitability({ invoiced: invoicedNet, collected, expenses: expensesTotal, loggedMinutes: totalMin, fixedPrice: project.fixedPrice });

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Link href="/admin/work" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Client work</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              <Link href={`/admin/clients/${project.user.id}`} className="hover:underline">{project.user.company || project.user.name}</Link>
              {" · "}<span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{PROJECT_STATUS_LABEL[project.status]}</span>{project.dueDate ? ` · due ${fmtDate(project.dueDate)}` : ""}
            </p>
          </div>
          <Link href={`/admin/clients/${project.user.id}`} className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-secondary">Edit project details</Link>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Project progress">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{progress.total === 0 ? "No tasks yet" : `${progress.done} of ${progress.total} tasks done (${progress.pct}%)`}</p>
        </div>
        {triage.length > 0 && (
          <p className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm"><Inbox className="size-4 text-accent" aria-hidden /> {triage.length} request{triage.length === 1 ? "" : "s"} from the client {triage.length === 1 ? "is" : "are"} waiting to be assigned (marked below).</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Project summary">
        {[
          { label: "Progress", value: `${progress.pct}%` },
          { label: "Open tasks", value: String(progress.total - progress.done) },
          { label: project.budgetMinutes > 0 ? `Hours of ${formatMinutes(project.budgetMinutes)}` : "Hours logged", value: formatMinutes(totalMin), tone: budget.state === "over" ? "text-destructive" : "" },
          canBill ? { label: "Unbilled time", value: unbilledMin > 0 ? formatMoney(unbilledAmt, cur) : "None" } : { label: "Milestones", value: String(project.milestoneRows.length) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className={cn("font-display text-xl leading-none font-bold tabular-nums", c.tone)}>{c.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Sections" className="sticky top-0 z-10 -mx-1 flex gap-1.5 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground">{label}</a>)}
      </nav>

      <section id="milestones" className="scroll-mt-14 space-y-4" aria-label="Milestones">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <Disclosure title="Add a milestone"><MilestoneForm projectId={project.id} milestoneId={null} initial={EMPTY_MILESTONE} /></Disclosure>
        {project.milestoneRows.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No milestones yet. Add one, or start from a template below.</p> : (
          <ul className="space-y-3">
            {project.milestoneRows.map((m) => {
              const st = milestoneState(m);
              const mt = project.tasks.filter((t) => t.milestoneId === m.id);
              const pr = progressOf(mt);
              const late = !milestoneIsFinished(st) && m.dueDate && m.dueDate.getTime() + 86_400_000 <= now.getTime();
              return (
                <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={cn("font-medium", milestoneIsFinished(st) && "text-muted-foreground")}>{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className={cn(st === "awaiting-approval" && "font-medium text-accent", milestoneIsFinished(st) && "text-success")}>{MILESTONE_STATE_LABEL[st]}</span>
                        {m.dueDate && <span className={late ? "text-destructive" : ""}> · {late ? "was due" : "due"} {fmtDate(m.dueDate)}</span>}
                        {mt.length > 0 && ` · ${pr.done} of ${pr.total} tasks done`}
                        {m.billAmount > 0 && ` · ${formatMoney(m.billAmount, cur)} invoiced on approval`}
                        {m.approvedAt && ` · approved by ${m.approvedBy || "client"} on ${fmtDate(m.approvedAt)}`}
                      </p>
                    </div>
                    <MilestoneActions milestoneId={m.id} completed={!!m.completedAt} approved={!!m.approvedAt} />
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Edit</summary>
                    <div className="mt-3"><MilestoneForm projectId={project.id} milestoneId={m.id} initial={{ title: m.title, dueDate: m.dueDate?.toISOString().slice(0, 10) ?? "", requiresApproval: m.requiresApproval, billAmount: m.billAmount ? minorToInput(m.billAmount) : "" }} /></div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="tasks" className="scroll-mt-14 space-y-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        {project.tasks.length === 0 && project.milestoneRows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Start from a template</p>
            <ApplyTemplateForm projectId={project.id} templates={templates} />
          </div>
        )}
        <Disclosure title="Add a task"><TaskForm projectId={project.id} taskId={null} initial={EMPTY_TASK} staff={staffOptions} milestones={milestoneOptions} /></Disclosure>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((s) => {
            const col = project.tasks.filter((t) => t.status === s);
            return (
              <div key={s} className="space-y-3 rounded-2xl bg-secondary/40 p-3">
                <h3 className="flex items-center gap-2 px-1 text-sm font-semibold"><span className={cn("size-2 rounded-full", COL_DOT[s])} aria-hidden />{TASK_STATUS_LABEL[s]} <span className="font-normal text-muted-foreground">({col.length})</span></h3>
                {col.length === 0 && <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">No tasks</p>}
                {col.map((t) => {
                  const late = taskIsOverdue(t, now);
                  return (
                    <div key={t.id} className={cn("space-y-2 rounded-xl border bg-card p-3 text-sm shadow-xs transition-shadow hover:shadow-md", t.fromClient && !t.assigneeId ? "border-accent/50" : "border-border")}>
                      <details>
                        <summary className="cursor-pointer list-none">
                          <p className={cn("font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {t.fromClient && <span className="font-medium text-accent">Client request</span>}
                            {t.assignee ? <span>{t.assignee.name}</span> : <span className="italic">Unassigned</span>}
                            {t.priority === 2 && <span className="text-destructive">High</span>}
                            {t.dueDate && <span className={late ? "text-destructive" : ""}>{late ? "Overdue " : "Due "}{fmtDate(t.dueDate)}</span>}
                            {t.milestone && <span>· {t.milestone.title}</span>}
                            {t.clientVisible && <span className="inline-flex items-center gap-0.5"><Eye className="size-3" aria-label="Visible to client" /> client</span>}
                          </p>
                        </summary>
                        <div className="mt-3 space-y-3 border-t border-border pt-3">
                          {t.description && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.description}</p>}
                          <TaskForm
                            projectId={project.id} taskId={t.id} staff={staffOptions} milestones={milestoneOptions}
                            initial={{ title: t.title, description: t.description, priority: t.priority, assigneeId: t.assigneeId ?? "", dueDate: t.dueDate?.toISOString().slice(0, 10) ?? "", clientVisible: t.clientVisible, milestoneId: t.milestoneId ?? "" }}
                          />
                          <DeleteTaskButton taskId={t.id} />
                        </div>
                      </details>
                      <TaskStatusSelect taskId={t.id} status={t.status} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section id="time" className="scroll-mt-14 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Time and budget</h2>
          <p className="text-sm text-muted-foreground">
            {formatMinutes(totalMin)} logged{project.budgetMinutes > 0 && <> of {formatMinutes(project.budgetMinutes)}</>}{project.hourlyRate > 0 && <> · {formatMoney(project.hourlyRate, cur)}/hour</>}
          </p>
        </div>
        {budget.state !== "none" && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.min(100, budget.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hours budget used">
              <div className={cn("h-full rounded-full", budget.state === "over" ? "bg-destructive" : budget.state === "warn" ? "bg-accent" : "bg-primary")} style={{ width: `${Math.min(100, budget.pct)}%` }} />
            </div>
            <p className={cn("mt-1.5 text-xs", budget.state === "over" ? "text-destructive" : "text-muted-foreground")}>
              {budget.pct}% of the hours budget used{budget.state === "over" ? ` (${formatMinutes(totalMin - project.budgetMinutes)} over)` : budget.state === "warn" ? ", nearly used up" : ""}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5">
          <LogTimeForm projectId={project.id} tasks={project.tasks.filter((t) => t.status !== "DONE").map((t) => ({ id: t.id, title: t.title }))} hasRate={project.hourlyRate > 0} />
        </div>

        {canBill && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <TermsForm
              projectId={project.id}
              rate={project.hourlyRate ? minorToInput(project.hourlyRate) : ""}
              budgetHours={project.budgetMinutes ? String(project.budgetMinutes / 60) : ""}
              fixedPrice={project.fixedPrice ? minorToInput(project.fixedPrice) : ""}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm">{unbilledMin > 0 ? <><span className="font-semibold">{formatMinutes(unbilledMin)}</span> unbilled = <span className="font-semibold">{formatMoney(unbilledAmt, cur)}</span></> : <span className="text-muted-foreground">No unbilled time</span>}</p>
              <InvoiceTimeButton projectId={project.id} label="Draft invoice from unbilled time" disabled={unbilledMin === 0} />
            </div>
          </div>
        )}

        {canBill && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Profitability">
            {[
              { label: "Invoiced (before tax)", value: formatMoney(invoicedNet, cur) },
              { label: "Still owed by client", value: formatMoney(Math.max(0, invoicedGross - collected), cur) },
              { label: "Expenses on project", value: formatMoney(expensesTotal, cur) },
              { label: money.marginPct === null ? "Margin" : `Margin (${money.marginPct}%)`, value: formatMoney(money.margin, cur), tone: money.margin < 0 ? "text-destructive" : "" },
              { label: "Earned per logged hour", value: money.perHour === null ? "n/a" : formatMoney(money.perHour, cur) },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                <p className={cn("font-display text-lg font-bold tabular-nums", c.tone)}>{c.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
              </div>
            ))}
            {money.toInvoice !== null && <p className="col-span-full text-xs text-muted-foreground">Fixed price {formatMoney(project.fixedPrice, cur)}: {money.toInvoice > 0 ? `${formatMoney(money.toInvoice, cur)} still to invoice.` : "fully invoiced."}</p>}
          </div>
        )}

        {project.timeEntries.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40"><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Who</th><th className="p-3 font-medium">Task and note</th><th className="p-3 text-right font-medium">Time</th><th className="p-3 font-medium">Billing</th><th className="w-10 p-3"><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {project.timeEntries.map((e) => (
                  <tr key={e.id} className="border-b border-border transition-colors last:border-0 hover:bg-secondary/40">
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.workedOn)}</td>
                    <td className="p-3">{e.user?.name ?? "Former staff"}</td>
                    <td className="p-3">{e.task?.title ?? "General"}{e.note && <span className="text-muted-foreground"> · {e.note}</span>}</td>
                    <td className="p-3 text-right tabular-nums">{formatMinutes(e.minutes)}</td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                      {e.invoice ? (canBill ? <Link href={`/admin/billing/invoices/${e.invoice.id}`} className="text-accent hover:underline">{e.invoice.number}</Link> : e.invoice.number) : e.billable && e.rateMinor > 0 ? "Unbilled" : "Not billable"}
                    </td>
                    <td className="p-1">{!e.invoice && <DeleteEntryButton entryId={e.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="conversation" className="scroll-mt-14 space-y-4" aria-label="Conversation">
        <h2 className="text-lg font-semibold">Conversation</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><StaffCommentForm projectId={project.id} /></div>
        {project.comments.length > 0 && (
          <ul className="space-y-3">
            {project.comments.map((c) => (
              <li key={c.id} className={cn("rounded-xl border p-4", c.internal ? "border-dashed border-muted-foreground/40 bg-secondary/40" : c.fromClient ? "border-border bg-card" : "border-accent/30 bg-accent/5")}>
                <p className="text-xs text-muted-foreground">{c.authorName}{c.fromClient ? " (client)" : ""}{c.internal ? " · internal note" : ""} · {fmtDate(c.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="files" className="scroll-mt-14 space-y-4" aria-label="Files">
        <h2 className="text-lg font-semibold">Files</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><ProjectFileForm projectId={project.id} /></div>
        {project.files.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {project.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span><a href={f.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{f.name}</a> <span className="text-muted-foreground">· {f.clientVisible ? "client can see" : "staff only"} · {fmtDate(f.createdAt)}</span></span>
                <DeleteFileButton fileId={f.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {project.tickets.length > 0 && (
        <section className="space-y-3" aria-label="Linked tickets">
          <h2 className="text-lg font-semibold">Support tickets</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {project.tickets.map((t) => (
              <li key={t.id}><Link href={`/admin/tickets/${t.id}`} className="flex flex-wrap justify-between gap-2 p-3 text-sm hover:bg-secondary/60"><span>{t.subject}</span><span className="text-muted-foreground">{ticketRef(t.id)}{t.tasks.length ? " · has a task" : ""}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
