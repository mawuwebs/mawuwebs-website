"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { nextNumber } from "@/lib/invoicing";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { getBillingSettings } from "@/lib/billing-settings";
import { formatMoney, parseMoney } from "@/lib/billing";
import { STARTER_TEMPLATES, addDays, isTaskStatus, parseDuration, parseTemplate, templateCounts, timeInvoiceLines } from "@/lib/work";

export type WorkResult = { success: boolean; message: string; id?: string };
const fail = (message: string): WorkResult => ({ success: false, message });

async function guard(fn: () => Promise<WorkResult>): Promise<WorkResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

function parseDate(s: string): Date | null | "bad" {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

function refresh(projectId: string, clientId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/work");
  revalidatePath(`/admin/work/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/projects/${projectId}`);
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

/** Staff members that can be given a task. Clients and disabled accounts cannot. */
async function validAssignee(id: string) {
  if (!id) return null;
  const u = await prisma.user.findFirst({ where: { id, role: { not: "CLIENT" }, disabledAt: null }, select: { id: true } });
  return u ? u.id : "bad";
}

async function validMilestone(id: string, projectId: string) {
  if (!id) return null;
  const m = await prisma.milestone.findFirst({ where: { id, projectId }, select: { id: true } });
  return m ? m.id : "bad";
}

const taskSchema = z.object({
  title: z.string().trim().min(2, "Give the task a title.").max(160),
  description: z.string().trim().max(4000).default(""),
  priority: z.coerce.number().int().min(0).max(2).default(1),
  assigneeId: z.string().default(""),
  dueDate: z.string().default(""),
  clientVisible: z.boolean().default(false),
  milestoneId: z.string().default(""),
});
export type TaskInput = z.input<typeof taskSchema>;

export async function createTask(projectId: string, input: TaskInput): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { id: true, userId: true } });
    if (!project) return fail("Project not found.");
    const due = parseDate(parsed.data.dueDate);
    if (due === "bad") return fail("Enter a valid due date.");
    const assignee = await validAssignee(parsed.data.assigneeId);
    if (assignee === "bad") return fail("Choose an active staff member.");
    const milestoneId = await validMilestone(parsed.data.milestoneId, projectId);
    if (milestoneId === "bad") return fail("That milestone is not in this project.");
    const task = await prisma.task.create({
      data: { projectId, title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority, assigneeId: assignee, dueDate: due, clientVisible: parsed.data.clientVisible, milestoneId },
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Task", entityId: task.id, message: `${user.name ?? "Staff"} added task "${task.title}"` });
    refresh(projectId, project.userId);
    return { success: true, message: "Task added.", id: task.id };
  });
}

export async function updateTask(taskId: string, input: TaskInput): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { userId: true } } } });
    if (!task) return fail("Task not found.");
    const due = parseDate(parsed.data.dueDate);
    if (due === "bad") return fail("Enter a valid due date.");
    const assignee = await validAssignee(parsed.data.assigneeId);
    if (assignee === "bad") return fail("Choose an active staff member.");
    const milestoneId = await validMilestone(parsed.data.milestoneId, task.projectId);
    if (milestoneId === "bad") return fail("That milestone is not in this project.");
    const dueChanged = (task.dueDate?.getTime() ?? null) !== (due?.getTime() ?? null);
    await prisma.task.update({
      where: { id: taskId },
      data: { title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority, assigneeId: assignee, dueDate: due, clientVisible: parsed.data.clientVisible, milestoneId, ...(dueChanged ? { overdueNotifiedAt: null } : {}) },
    });
    await logActivity({ userId: user.id, action: "updated", entityType: "Task", entityId: taskId, message: `${user.name ?? "Staff"} edited task "${parsed.data.title}"` });
    refresh(task.projectId, task.project.userId);
    return { success: true, message: "Saved." };
  });
}

export async function setTaskStatus(taskId: string, status: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    if (!isTaskStatus(status)) return fail("Unknown status.");
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { userId: true } } } });
    if (!task) return fail("Task not found.");
    if (task.status === status) return { success: true, message: "No change." };
    await prisma.task.update({ where: { id: taskId }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
    if (status === "DONE") await logActivity({ userId: user.id, action: "updated", entityType: "Task", entityId: taskId, message: `${user.name ?? "Staff"} completed "${task.title}"` });
    refresh(task.projectId, task.project.userId);
    return { success: true, message: "Moved." };
  });
}

export async function deleteTask(taskId: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { userId: true } } } });
    if (!task) return fail("Task not found.");
    await prisma.task.delete({ where: { id: taskId } });
    refresh(task.projectId, task.project.userId);
    return { success: true, message: "Task deleted. Time already logged on it is kept." };
  });
}

export async function logTime(projectId: string, input: { duration: string; note: string; taskId: string; workedOn: string; billable: boolean }): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const minutes = parseDuration(input.duration);
    if (minutes === null) return fail("Enter the time like 1.5, 1:30, 90m or 2h (up to 24 hours).");
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { id: true, userId: true, hourlyRate: true } });
    if (!project) return fail("Project not found.");
    const workedOn = parseDate(input.workedOn) ?? new Date();
    if (workedOn === "bad") return fail("Enter a valid date.");
    if (workedOn.getTime() > Date.now() + 86_400_000) return fail("The date cannot be in the future.");
    let taskId: string | null = null;
    if (input.taskId) {
      const t = await prisma.task.findFirst({ where: { id: input.taskId, projectId }, select: { id: true } });
      if (!t) return fail("That task is not in this project.");
      taskId = t.id;
    }
    const billable = input.billable && project.hourlyRate > 0;
    const entry = await prisma.timeEntry.create({
      data: { projectId, taskId, userId: user.id, minutes, note: input.note.trim().slice(0, 300), workedOn, billable, rateMinor: billable ? project.hourlyRate : 0 },
    });
    refresh(projectId, project.userId);
    return { success: true, message: "Time logged.", id: entry.id };
  });
}

export async function deleteTimeEntry(entryId: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const e = await prisma.timeEntry.findUnique({ where: { id: entryId }, include: { project: { select: { userId: true } } } });
    if (!e) return fail("Entry not found.");
    if (e.invoiceId) return fail("This time is on an invoice. Delete the draft invoice first to free it.");
    if (e.userId !== user.id && user.role !== "ADMIN") return fail("Only the person who logged this time (or an admin) can remove it.");
    await prisma.timeEntry.delete({ where: { id: entryId } });
    refresh(e.projectId, e.project.userId);
    return { success: true, message: "Entry removed." };
  });
}

export async function setProjectTerms(projectId: string, input: { rate: string; budgetHours: string; fixedPrice: string }): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("billing");
    const rate = input.rate.trim() === "" ? 0 : parseMoney(input.rate);
    const price = input.fixedPrice.trim() === "" ? 0 : parseMoney(input.fixedPrice);
    if (rate === null) return fail("Enter an hourly rate like 150 or 150.50, or leave it empty.");
    if (price === null) return fail("Enter a fixed price like 5000 or 5000.50, or leave it empty.");
    const p = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!p) return fail("Project not found.");
    const budgetMinutes = input.budgetHours.trim() === "" ? 0 : Math.round(Number(input.budgetHours.replace(",", ".")) * 60);
    if (!Number.isFinite(budgetMinutes) || budgetMinutes < 0 || budgetMinutes > 100_000 * 60) return fail("Enter the hours budget as a number like 40.");
    await prisma.clientProject.update({ where: { id: projectId }, data: { hourlyRate: rate, fixedPrice: price, budgetMinutes } });
    refresh(projectId, p.userId);
    return { success: true, message: "Terms saved. A changed hourly rate applies to time logged from now on." };
  });
}

/** Drafts an invoice from all unbilled billable time on a project. The invoice is a draft so you can review it before sending. */
export async function invoiceUnbilledTime(projectId: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { id: true, title: true, userId: true } });
    if (!project) return fail("Project not found.");
    const entries = await prisma.timeEntry.findMany({ where: { projectId, billable: true, invoiceId: null, rateMinor: { gt: 0 } }, include: { task: { select: { title: true } } }, orderBy: { workedOn: "asc" } });
    const plan = timeInvoiceLines(entries);
    if (plan.lines.length === 0) return fail("There is no unbilled time with a rate to invoice.");
    const settings = await getBillingSettings();
    const due = new Date(Date.now() + settings.defaultDueDays * 86_400_000);

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "invoice");
      const inv = await tx.invoice.create({
        data: {
          number, token: randomBytes(24).toString("base64url"), userId: project.userId, projectId, title: `${project.title}: time and materials`,
          currency: settings.defaultCurrency, taxBp: settings.defaultTaxBp, dueDate: due,
          items: { create: plan.lines.map((l, i) => ({ description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, position: i })) },
        },
      });
      // Claim the entries only if none were billed meanwhile; otherwise abort the whole invoice.
      const claim = await tx.timeEntry.updateMany({ where: { id: { in: plan.entryIds }, invoiceId: null }, data: { invoiceId: inv.id } });
      if (claim.count !== plan.entryIds.length) throw new Error("Some of that time was billed a moment ago. Refresh and try again.");
      return inv;
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Invoice", entityId: invoice.id, message: `${user.name ?? "Staff"} drafted ${invoice.number} from ${plan.minutes} min of logged time (${formatMoney(plan.amount, settings.defaultCurrency)})` });
    refresh(projectId, project.userId);
    revalidatePath("/admin/billing");
    return { success: true, message: `Draft invoice ${invoice.number} created. Review and send it from Billing.`, id: invoice.id };
  });
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
const milestoneSchema = z.object({
  title: z.string().trim().min(2, "Give the milestone a title.").max(140),
  dueDate: z.string().default(""),
  requiresApproval: z.boolean().default(false),
  billAmount: z.string().default(""),
});
export type MilestoneInput = z.input<typeof milestoneSchema>;

function readMilestone(input: MilestoneInput) {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const due = parseDate(parsed.data.dueDate);
  if (due === "bad") return fail("Enter a valid due date.");
  const bill = parsed.data.billAmount.trim() === "" ? 0 : parseMoney(parsed.data.billAmount);
  if (bill === null) return fail("Enter the amount to invoice like 1500 or 1500.50, or leave it empty.");
  if (bill > 0 && !parsed.data.requiresApproval) return fail("An amount is invoiced when the client approves, so turn on client approval or clear the amount.");
  return { title: parsed.data.title, dueDate: due, requiresApproval: parsed.data.requiresApproval, billAmount: bill };
}

export async function addMilestone(projectId: string, input: MilestoneInput): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const d = readMilestone(input);
    if ("success" in d) return d;
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) return fail("Project not found.");
    const last = await prisma.milestone.findFirst({ where: { projectId }, orderBy: { position: "desc" }, select: { position: true } });
    const m = await prisma.milestone.create({ data: { ...d, projectId, position: (last?.position ?? -1) + 1 } });
    refresh(projectId, project.userId);
    return { success: true, message: "Milestone added.", id: m.id };
  });
}

export async function updateMilestone(id: string, input: MilestoneInput): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const d = readMilestone(input);
    if ("success" in d) return d;
    const m = await prisma.milestone.findUnique({ where: { id }, include: { project: { select: { userId: true } } } });
    if (!m) return fail("Milestone not found.");
    if (m.approvedAt && (d.billAmount !== m.billAmount || d.requiresApproval !== m.requiresApproval)) return fail("The client already approved this milestone, so its approval and amount are locked.");
    await prisma.milestone.update({ where: { id }, data: d });
    refresh(m.projectId, m.project.userId);
    return { success: true, message: "Saved." };
  });
}

export async function deleteMilestone(id: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const m = await prisma.milestone.findUnique({ where: { id }, include: { project: { select: { userId: true } } } });
    if (!m) return fail("Milestone not found.");
    await prisma.milestone.delete({ where: { id } });
    refresh(m.projectId, m.project.userId);
    return { success: true, message: "Milestone deleted. Its tasks are kept." };
  });
}

/** Mark a milestone complete. With client approval on, the client is asked to sign it off. */
export async function completeMilestone(id: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const m = await prisma.milestone.findUnique({ where: { id }, include: { project: { select: { id: true, title: true, userId: true, user: { select: { name: true, email: true, billingEmail: true } } } } } });
    if (!m) return fail("Milestone not found.");
    if (m.completedAt) return { success: true, message: "Already complete." };
    const now = new Date();
    await prisma.milestone.update({ where: { id }, data: { completedAt: now, approvalRequestedAt: m.requiresApproval ? now : null } });
    await logActivity({ userId: user.id, action: "updated", entityType: "ClientProject", entityId: m.projectId, message: `${user.name ?? "Staff"} completed milestone "${m.title}"` });
    let note = "Milestone complete.";
    if (m.requiresApproval) {
      const settings = await getSiteSettings();
      const emailed = await sendMail({
        to: m.project.user.billingEmail || m.project.user.email,
        replyTo: notifyEmail(settings.contactEmail),
        subject: `Please review: ${m.title} (${m.project.title})`,
        text: `Hi ${m.project.user.name.split(" ")[0]},\n\nThe "${m.title}" stage of "${m.project.title}" is ready for your review. When you are happy with it, please approve it in your portal so we can move on${m.billAmount > 0 ? ` (we will then send an invoice for ${formatMoney(m.billAmount, (await getBillingSettings()).defaultCurrency)})` : ""}.\n\n${siteUrl()}/portal/projects/${m.projectId}\n\n${settings.siteName}`,
      });
      note = emailed ? "Milestone complete. The client was emailed to approve it." : "Milestone complete. Email is not configured or failed, so ask the client to approve it in their portal.";
    }
    refresh(m.projectId, m.project.userId);
    return { success: true, message: note };
  });
}

export async function reopenMilestone(id: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const m = await prisma.milestone.findUnique({ where: { id }, include: { project: { select: { userId: true } } } });
    if (!m) return fail("Milestone not found.");
    if (m.approvedAt) return fail("The client already approved this milestone, so it cannot be reopened.");
    await prisma.milestone.update({ where: { id }, data: { completedAt: null, approvalRequestedAt: null } });
    refresh(m.projectId, m.project.userId);
    return { success: true, message: "Milestone reopened." };
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function saveTemplate(id: string | null, input: { name: string; description: string; body: string }): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) return fail("Give the template a name (2 to 80 characters).");
    const counts = templateCounts(parseTemplate(input.body));
    if (counts.milestones + counts.tasks === 0) return fail("Add at least one line starting with # (milestone) or - (task).");
    const data = { name, description: input.description.trim().slice(0, 300), body: input.body.slice(0, 20_000) };
    try {
      const t = id ? await prisma.projectTemplate.update({ where: { id }, data }) : await prisma.projectTemplate.create({ data });
      revalidatePath("/admin/work/templates");
      return { success: true, message: "Template saved.", id: t.id };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return fail("A template with that name already exists.");
      throw err;
    }
  });
}

export async function deleteTemplate(id: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    await prisma.projectTemplate.deleteMany({ where: { id } });
    revalidatePath("/admin/work/templates");
    return { success: true, message: "Template deleted." };
  });
}

export async function addStarterTemplates(): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    let added = 0;
    for (const t of STARTER_TEMPLATES) {
      if (await prisma.projectTemplate.findUnique({ where: { name: t.name }, select: { id: true } })) continue;
      await prisma.projectTemplate.create({ data: { name: t.name, description: t.description, body: t.body } });
      added++;
    }
    revalidatePath("/admin/work/templates");
    return { success: true, message: added ? `Added ${added} starter template${added === 1 ? "" : "s"}.` : "Starter templates are already there." };
  });
}

/** Adds a template's milestones and tasks to a project. Due dates count from `startDate` (default today). */
export async function applyTemplate(projectId: string, templateId: string, startDate: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const [project, tpl] = await Promise.all([
      prisma.clientProject.findUnique({ where: { id: projectId }, select: { userId: true } }),
      prisma.projectTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (!project) return fail("Project not found.");
    if (!tpl) return fail("Template not found.");
    const start = parseDate(startDate) ?? new Date();
    if (start === "bad") return fail("Enter a valid start date.");
    const parsed = parseTemplate(tpl.body);
    const counts = templateCounts(parsed);
    if (counts.milestones + counts.tasks === 0) return fail("That template is empty.");
    await prisma.$transaction(async (tx) => {
      const last = await tx.milestone.findFirst({ where: { projectId }, orderBy: { position: "desc" }, select: { position: true } });
      let pos = (last?.position ?? -1) + 1;
      const due = (n: number | null) => (n === null ? null : addDays(start, n));
      for (const t of parsed.loose) {
        await tx.task.create({ data: { projectId, title: t.title, dueDate: due(t.offsetDays), clientVisible: t.clientVisible, priority: t.priority } });
      }
      for (const m of parsed.milestones) {
        const row = await tx.milestone.create({ data: { projectId, title: m.title, position: pos++, dueDate: due(m.offsetDays), requiresApproval: m.requiresApproval, billAmount: m.requiresApproval ? Math.round(m.billMajor * 100) : 0 } });
        for (const t of m.tasks) {
          await tx.task.create({ data: { projectId, milestoneId: row.id, title: t.title, dueDate: due(t.offsetDays), clientVisible: t.clientVisible, priority: t.priority } });
        }
      }
    });
    await logActivity({ userId: user.id, action: "updated", entityType: "ClientProject", entityId: projectId, message: `${user.name ?? "Staff"} applied template "${tpl.name}" (${counts.milestones} milestones, ${counts.tasks} tasks)` });
    refresh(projectId, project.userId);
    return { success: true, message: `Added ${counts.milestones} milestones and ${counts.tasks} tasks from "${tpl.name}".` };
  });
}

// ---------------------------------------------------------------------------
// Comments and files
// ---------------------------------------------------------------------------
export async function addStaffComment(projectId: string, body: string, internal: boolean): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const text = body.trim();
    if (text.length < 1) return fail("Write a message first.");
    if (text.length > 4000) return fail("Keep it under 4000 characters.");
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { userId: true, title: true, user: { select: { name: true, email: true, billingEmail: true } } } });
    if (!project) return fail("Project not found.");
    await prisma.projectComment.create({ data: { projectId, userId: user.id, authorName: user.name ?? "Staff", body: text, internal } });
    let note = internal ? "Internal note saved." : "Message posted.";
    if (!internal) {
      const settings = await getSiteSettings();
      const emailed = await sendMail({
        to: project.user.billingEmail || project.user.email,
        replyTo: notifyEmail(settings.contactEmail),
        subject: `New message on ${project.title}`,
        text: `Hi ${project.user.name.split(" ")[0]},\n\n${user.name ?? "We"} wrote:\n\n${text}\n\nReply in your portal:\n${siteUrl()}/portal/projects/${projectId}\n\n${settings.siteName}`,
      });
      if (emailed) note = "Message posted and emailed to the client.";
    }
    refresh(projectId, project.userId);
    return { success: true, message: note };
  });
}

const FILE_URL = /^(https?:\/\/[^\s]+|\/uploads\/[^\s]+)$/i;

export async function addProjectFile(projectId: string, input: { name: string; url: string; clientVisible: boolean }): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const name = input.name.trim();
    if (name.length < 2 || name.length > 140) return fail("Give the file a name.");
    const url = input.url.trim();
    if (!FILE_URL.test(url) || url.length > 1000) return fail("Enter a link starting with https:// or /uploads/.");
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) return fail("Project not found.");
    await prisma.projectFile.create({ data: { projectId, name, url, clientVisible: input.clientVisible } });
    refresh(projectId, project.userId);
    return { success: true, message: "File added." };
  });
}

export async function deleteProjectFile(id: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const f = await prisma.projectFile.findUnique({ where: { id }, include: { project: { select: { userId: true } } } });
    if (!f) return fail("File not found.");
    await prisma.projectFile.delete({ where: { id } });
    refresh(f.projectId, f.project.userId);
    return { success: true, message: "File removed." };
  });
}

// ---------------------------------------------------------------------------
// Tickets and projects
// ---------------------------------------------------------------------------
export async function linkTicketToProject(ticketId: string, projectId: string): Promise<WorkResult> {
  return guard(async () => {
    await requireArea("orders");
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { userId: true } });
    if (!ticket) return fail("Ticket not found.");
    if (projectId) {
      const p = await prisma.clientProject.findFirst({ where: { id: projectId, userId: ticket.userId }, select: { id: true } });
      if (!p) return fail("Choose one of this client's projects.");
    }
    await prisma.ticket.update({ where: { id: ticketId }, data: { projectId: projectId || null } });
    revalidatePath(`/admin/tickets/${ticketId}`);
    if (projectId) revalidatePath(`/admin/work/${projectId}`);
    return { success: true, message: projectId ? "Ticket linked to the project." : "Link removed." };
  });
}

export async function createTaskFromTicket(ticketId: string): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { project: { select: { userId: true } } } });
    if (!t || !t.projectId || !t.project) return fail("Link the ticket to a project first.");
    if (await prisma.task.findFirst({ where: { ticketId }, select: { id: true } })) return fail("A task already exists for this ticket.");
    const task = await prisma.task.create({
      data: { projectId: t.projectId, ticketId, title: `Ticket T-${t.id.slice(-6).toUpperCase()}: ${t.subject}`.slice(0, 160), description: t.body.slice(0, 4000), priority: t.urgent ? 2 : 1, assigneeId: user.id },
    });
    refresh(t.projectId, t.project.userId);
    revalidatePath(`/admin/tickets/${ticketId}`);
    return { success: true, message: "Task created and assigned to you.", id: task.id };
  });
}

// ---------------------------------------------------------------------------
// Calendar subscription
// ---------------------------------------------------------------------------
export async function resetCalendarToken(): Promise<WorkResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    await prisma.user.update({ where: { id: user.id }, data: { calendarToken: randomBytes(24).toString("base64url") } });
    revalidatePath("/admin/work/calendar");
    return { success: true, message: "New calendar link created. Any old link stopped working." };
  });
}
