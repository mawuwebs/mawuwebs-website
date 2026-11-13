import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";
import { PROJECT_STATUS_LABEL, formatMoney } from "@/lib/billing";
import { getBillingSettings } from "@/lib/billing-settings";
import { MILESTONE_STATE_LABEL, TASK_STATUS_LABEL, milestoneIsFinished, milestoneState, progressOf } from "@/lib/work";
import { ApproveButton, ClientCommentForm, RequestWorkForm } from "@/components/portal/project-forms";

export const metadata: Metadata = { title: "Project" };

export default async function PortalProject({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortalUser();
  const { id } = await params;
  const p = await prisma.clientProject.findFirst({
    where: { id, userId: user.id },
    include: {
      milestoneRows: { orderBy: { position: "asc" } },
      tasks: { where: { clientVisible: true }, orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }], select: { id: true, title: true, status: true, dueDate: true, milestoneId: true, fromClient: true } },
      comments: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 50 },
      files: { where: { clientVisible: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();
  const cur = (await getBillingSettings()).defaultCurrency;
  const pr = progressOf(p.tasks);
  const loose = p.tasks.filter((t) => !t.milestoneId);

  const TaskRow = ({ t }: { t: (typeof p.tasks)[number] }) => (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        {t.status === "DONE" ? <Check className="size-4 text-success" aria-label="Done" /> : <Circle className="size-4 text-muted-foreground" aria-label="Not done" />}
        <span className={t.status === "DONE" ? "text-muted-foreground line-through" : ""}>{t.title}{t.fromClient ? <span className="text-xs text-muted-foreground"> (your request)</span> : ""}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{t.status === "DONE" ? "" : TASK_STATUS_LABEL[t.status]}{t.status !== "DONE" && t.dueDate ? ` · ${fmtDate(t.dueDate)}` : ""}</span>
    </li>
  );

  return (
    <div className="space-y-10">
      <div>
        <Link href="/portal/projects" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{p.title}</h1>
        <p className="mt-1 text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}{p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}</p>
        {p.summary && <p className="mt-3 text-sm">{p.summary}</p>}
        {pr.total > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pr.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><div className="h-full rounded-full bg-primary" style={{ width: `${pr.pct}%` }} /></div>
            <p className="mt-1.5 text-sm font-medium">{pr.done} of {pr.total} tasks done</p>
          </div>
        )}
      </div>

      {p.milestoneRows.length > 0 && (
        <section className="space-y-3" aria-label="Milestones">
          <h2 className="font-display text-xl font-semibold">Milestones</h2>
          <ul className="space-y-3">
            {p.milestoneRows.map((m) => {
              const st = milestoneState(m);
              const mt = p.tasks.filter((t) => t.milestoneId === m.id);
              return (
                <li key={m.id} className={`rounded-2xl border p-4 ${st === "awaiting-approval" ? "border-accent/50 bg-accent/5" : "border-border bg-card"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        {milestoneIsFinished(st) ? <Check className="size-4 text-success" aria-label="Done" /> : st === "awaiting-approval" ? <Clock className="size-4 text-accent" aria-label="Needs your approval" /> : <Circle className="size-4 text-muted-foreground" aria-label="Not done" />}
                        {m.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {st === "awaiting-approval" ? "Waiting for your approval" : MILESTONE_STATE_LABEL[st]}
                        {m.dueDate && !milestoneIsFinished(st) && ` · due ${fmtDate(m.dueDate)}`}
                        {m.approvedAt && ` · you approved it on ${fmtDate(m.approvedAt)}`}
                        {st === "awaiting-approval" && m.billAmount > 0 && ` · approving sends an invoice for ${formatMoney(m.billAmount, cur)}`}
                      </p>
                    </div>
                    {st === "awaiting-approval" && <ApproveButton milestoneId={m.id} title={m.title} />}
                  </div>
                  {mt.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{mt.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {loose.length > 0 && (
        <section className="space-y-3" aria-label="Other tasks">
          <h2 className="font-display text-xl font-semibold">{p.milestoneRows.length ? "Other tasks" : "Tasks"}</h2>
          <ul className="space-y-1.5 text-sm">{loose.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        </section>
      )}

      {p.files.length > 0 && (
        <section className="space-y-3" aria-label="Files">
          <h2 className="font-display text-xl font-semibold">Files</h2>
          <ul className="divide-y divide-border border-y border-border">
            {p.files.map((f) => <li key={f.id} className="flex justify-between gap-3 py-3 text-sm"><a href={f.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{f.name}</a><span className="text-muted-foreground">{fmtDate(f.createdAt)}</span></li>)}
          </ul>
        </section>
      )}

      {p.status !== "DONE" && (
        <section className="space-y-3" aria-label="Ask for something">
          <h2 className="font-display text-xl font-semibold">Ask for something new</h2>
          <p className="text-sm text-muted-foreground">Need a change or an extra? Send it here and it goes straight onto the project board.</p>
          <div className="rounded-2xl border border-border bg-card p-5"><RequestWorkForm projectId={p.id} /></div>
        </section>
      )}

      <section className="space-y-3" aria-label="Messages">
        <h2 className="font-display text-xl font-semibold">Messages</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><ClientCommentForm projectId={p.id} /></div>
        {p.comments.length > 0 && (
          <ul className="space-y-3">
            {p.comments.map((c) => (
              <li key={c.id} className={`rounded-xl border p-4 ${c.fromClient ? "border-border bg-card" : "border-accent/30 bg-accent/5"}`}>
                <p className="text-xs text-muted-foreground">{c.fromClient ? "You" : c.authorName} · {fmtDate(c.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
