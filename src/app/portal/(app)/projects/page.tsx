import type { Metadata } from "next";
import { Check, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";
import { PROJECT_STATUS_LABEL, parseMilestones } from "@/lib/billing";

export const metadata: Metadata = { title: "Projects" };

export default async function PortalProjects() {
  const user = await requirePortalUser();
  const projects = await prisma.clientProject.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Projects</h1>
      <p className="mt-1 text-muted-foreground">Where each piece of work stands.</p>
      {projects.length === 0 ? <p className="mt-6 text-muted-foreground">No projects yet.</p> : (
        <ul className="mt-6 space-y-6">
          {projects.map((p) => {
            const ms = parseMilestones(p.milestones);
            const done = ms.filter((m) => m.done).length;
            return (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold">{p.title}</h2>
                  <span className="text-sm text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}{p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}</span>
                </div>
                {p.summary && <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>}
                {ms.length > 0 && (
                  <>
                    <p className="mt-4 text-sm font-medium">{done} of {ms.length} milestones done</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {ms.map((m, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {m.done ? <Check className="size-4 text-success" aria-label="Done" /> : <Circle className="size-4 text-muted-foreground" aria-label="Not done" />}
                          <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
