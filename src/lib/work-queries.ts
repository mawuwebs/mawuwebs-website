import "server-only";
import { prisma } from "@/lib/prisma";
import { progressOf, projectHealth, taskIsOverdue, timeAmount } from "@/lib/work";

const DAY = 864e5;

/** Active client projects with the numbers the work list and dashboard need. */
export async function getWorkProjects(opts: { includeDone?: boolean } = {}) {
  const now = new Date();
  const projects = await prisma.clientProject.findMany({
    where: opts.includeDone ? {} : { status: { not: "DONE" } },
    include: {
      user: { select: { id: true, name: true, company: true } },
      tasks: { select: { status: true, dueDate: true, updatedAt: true, assigneeId: true } },
      timeEntries: { select: { minutes: true, billable: true, invoiceId: true, rateMinor: true, workedOn: true } },
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return projects.map((p) => {
    const progress = progressOf(p.tasks);
    const overdueTasks = p.tasks.filter((t) => taskIsOverdue(t, now)).length;
    const lastActivity = [p.updatedAt, ...p.tasks.map((t) => t.updatedAt), ...p.timeEntries.map((e) => e.workedOn)].reduce<Date | null>((a, d) => (!a || d > a ? d : a), null);
    const minutes = p.timeEntries.reduce((n, e) => n + e.minutes, 0);
    const unbilled = p.timeEntries.filter((e) => e.billable && !e.invoiceId && e.rateMinor > 0);
    return {
      id: p.id, title: p.title, status: p.status, dueDate: p.dueDate, client: p.user,
      progress, overdueTasks, openTasks: progress.total - progress.done, minutes,
      unbilledMinutes: unbilled.reduce((n, e) => n + e.minutes, 0),
      unbilledAmount: unbilled.reduce((n, e) => n + timeAmount(e.minutes, e.rateMinor), 0),
      budgetMinutes: p.budgetMinutes,
      health: projectHealth({ status: p.status, dueDate: p.dueDate, lastActivity, overdueTasks, loggedMinutes: minutes, budgetMinutes: p.budgetMinutes }, now),
    };
  });
}

/** Tasks assigned to one staff member that are not done, most urgent first. */
export async function getMyTasks(userId: string, take = 50) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId, status: { not: "DONE" }, project: { status: { not: "DONE" } } },
    include: { project: { select: { id: true, title: true, user: { select: { name: true, company: true } } } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take,
  });
  const now = new Date();
  return tasks.map((t) => ({ ...t, overdue: taskIsOverdue(t, now) }));
}

/** Project work on the main dashboard. `days` is the dashboard range. */
export async function getWorkDashboard(userId: string, days: number) {
  const now = new Date();
  const from = new Date(+now - days * DAY);
  const in7 = new Date(+now + 7 * DAY);
  const [projects, mine, openTasks, dueSoon, doneInRange, hours, unbilled, awaitingApproval, clientRequests] = await Promise.all([
    getWorkProjects(),
    getMyTasks(userId, 8),
    prisma.task.findMany({ where: { status: { not: "DONE" }, project: { status: { not: "DONE" } } }, select: { status: true, dueDate: true } }),
    prisma.task.count({ where: { status: { not: "DONE" }, dueDate: { gte: now, lt: in7 }, project: { status: { not: "DONE" } } } }),
    prisma.task.count({ where: { status: "DONE", completedAt: { gte: from } } }),
    prisma.timeEntry.aggregate({ where: { workedOn: { gte: from } }, _sum: { minutes: true } }),
    prisma.timeEntry.findMany({ where: { billable: true, invoiceId: null, rateMinor: { gt: 0 } }, select: { minutes: true, rateMinor: true } }),
    prisma.milestone.count({ where: { requiresApproval: true, completedAt: { not: null }, approvedAt: null, project: { status: { not: "DONE" } } } }),
    prisma.task.count({ where: { fromClient: true, assigneeId: null, status: { not: "DONE" } } }),
  ]);
  const overdue = openTasks.filter((t) => taskIsOverdue(t, now)).length;
  return {
    isEmpty: projects.length === 0 && openTasks.length === 0,
    activeProjects: projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "REVIEW").length,
    totalProjects: projects.length,
    openTasks: openTasks.length,
    overdue,
    dueSoon,
    doneInRange,
    minutesInRange: hours._sum.minutes ?? 0,
    unbilledMinutes: unbilled.reduce((n, e) => n + e.minutes, 0),
    unbilledAmount: unbilled.reduce((n, e) => n + timeAmount(e.minutes, e.rateMinor), 0),
    awaitingApproval,
    clientRequests,
    overBudget: projects.filter((p) => p.health === "budget").length,
    atRisk: projects.filter((p) => p.health !== "ok").sort((a, b) => (a.health === "late" ? -1 : 1) - (b.health === "late" ? -1 : 1)).slice(0, 5),
    mine,
    mineOverdue: mine.filter((t) => t.overdue).length,
  };
}
