import type { Metadata } from "next";
import { Check, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";
import Link from "next/link";
import { PROJECT_STATUS_LABEL } from "@/lib/billing";
import { TASK_STATUS_LABEL, milestoneIsFinished, milestoneState, progressOf } from "@/lib/work";

export const metadata: Metadata = { title: "Projects" };

export default async function PortalProjects() {
  const user = await requirePortalUser();
  const projects = await prisma.clientProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { milestoneRows: { orderBy: { position: "asc" } }, tasks: { where: { clientVisible: true }, orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }], select: { id: true, title: true, status: true, dueDate: true } } },
  });
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Projects</h1>
      <p className="mt-1 text-muted-foreground">Where each piece of work stands.</p>
      {projects.length === 0 ? <p className="mt-6 text-muted-foreground">No projects yet.</p> : (
        <ul className="mt-6 space-y-6">
          {projects.map((p) => {
            const ms = p.milestoneRows.map((m) => ({ title: m.title, done: milestoneIsFinished(milestoneState(m)), waiting: milestoneState(m) === "awaiting-approval" }));
            const done = ms.filter((m) => m.done).length;
            return (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold"><Link href={`/portal/projects/${p.id}`} className="hover:underline">{p.title}</Link></h2>
                  <span className="text-sm text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}{p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}</span>
                </div>
                {p.summary && <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>}
                {p.tasks.length > 0 && (() => {
                  const pr = progressOf(p.tasks);
                  return (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pr.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.title} progress`}><div className="h-full rounded-full bg-primary" style={{ width: `${pr.pct}%` }} /></div>
                      <p className="mt-1.5 text-sm font-medium">{pr.done} of {pr.total} tasks done</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {p.tasks.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              {t.status === "DONE" ? <Check className="size-4 text-success" aria-label="Done" /> : <Circle className="size-4 text-muted-foreground" aria-label="Not done" />}
                              <span className={t.status === "DONE" ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{t.status === "DONE" ? "" : TASK_STATUS_LABEL[t.status]}{t.status !== "DONE" && t.dueDate ? ` · ${fmtDate(t.dueDate)}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {ms.length > 0 && (
                  <>
                    <p className="mt-4 text-sm font-medium">{done} of {ms.length} milestones done</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {ms.map((m, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {m.done ? <Check className="size-4 text-success" aria-label="Done" /> : <Circle className="size-4 text-muted-foreground" aria-label="Not done" />}
                          <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.title}{m.waiting ? <span className="text-accent"> · waiting for your approval</span> : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-4 text-sm"><Link href={`/portal/projects/${p.id}`} className="text-accent hover:underline">Open project, messages and requests</Link></p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
