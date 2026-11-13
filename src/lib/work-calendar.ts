import "server-only";
import { prisma } from "@/lib/prisma";
import type { CalEvent } from "@/lib/work";

/**
 * Dates staff care about, as all-day events: tasks (everyone's open tasks, or only the viewer's), milestone due dates,
 * project deadlines and client item renewals. `mineOnly` limits tasks to one person (used by personal feeds).
 */
export async function getCalendarEvents(opts: { userId?: string; mineOnly?: boolean; from: Date; to: Date }): Promise<(CalEvent & { href: string; kind: "task" | "milestone" | "project" | "renewal"; late: boolean })[]> {
  const { from, to } = opts;
  const now = Date.now();
  const taskWhere = { status: { not: "DONE" as const }, dueDate: { gte: from, lt: to }, project: { status: { not: "DONE" as const } }, ...(opts.mineOnly && opts.userId ? { assigneeId: opts.userId } : {}) };
  const [tasks, milestones, projects, assets] = await Promise.all([
    prisma.task.findMany({ where: taskWhere, include: { project: { select: { id: true, title: true } }, assignee: { select: { name: true } } } }),
    prisma.milestone.findMany({ where: { completedAt: null, dueDate: { gte: from, lt: to }, project: { status: { not: "DONE" } } }, include: { project: { select: { id: true, title: true } } } }),
    prisma.clientProject.findMany({ where: { status: { not: "DONE" }, dueDate: { gte: from, lt: to } }, select: { id: true, title: true, dueDate: true, user: { select: { company: true, name: true } } } }),
    opts.mineOnly ? Promise.resolve([]) : prisma.clientAsset.findMany({ where: { expiresAt: { gte: from, lt: to } }, select: { id: true, name: true, type: true, expiresAt: true, userId: true, user: { select: { company: true, name: true } } } }),
  ]);
  return [
    ...tasks.map((t) => ({ uid: `task-${t.id}`, summary: `Task: ${t.title}`, date: t.dueDate!, description: `${t.project.title}${t.assignee ? ` (${t.assignee.name})` : ""}`, href: `/admin/work/${t.project.id}`, kind: "task" as const, late: t.dueDate!.getTime() + 86_400_000 <= now })),
    ...milestones.map((m) => ({ uid: `ms-${m.id}`, summary: `Milestone: ${m.title}`, date: m.dueDate!, description: m.project.title, href: `/admin/work/${m.project.id}`, kind: "milestone" as const, late: m.dueDate!.getTime() + 86_400_000 <= now })),
    ...projects.map((p) => ({ uid: `proj-${p.id}`, summary: `Project due: ${p.title}`, date: p.dueDate!, description: p.user.company || p.user.name, href: `/admin/work/${p.id}`, kind: "project" as const, late: p.dueDate!.getTime() + 86_400_000 <= now })),
    ...assets.map((a) => ({ uid: `asset-${a.id}`, summary: `Renewal: ${a.name} (${a.type})`, date: a.expiresAt!, description: a.user.company || a.user.name, href: `/admin/clients/${a.userId}`, kind: "renewal" as const, late: a.expiresAt!.getTime() < now })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}
