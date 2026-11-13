"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAction } from "@/lib/portal";
import { logActivity } from "@/lib/activity-log";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { getBillingSettings } from "@/lib/billing-settings";
import { nextNumber } from "@/lib/invoicing";
import { rateLimited } from "@/lib/rate-limit";
import { formatMoney } from "@/lib/billing";

export type PortalWorkResult = { success: boolean; message: string };
const fail = (message: string): PortalWorkResult => ({ success: false, message });

async function guard(fn: () => Promise<PortalWorkResult>): Promise<PortalWorkResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

function refresh(projectId: string) {
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/projects/${projectId}`);
  revalidatePath("/portal/invoices");
  revalidatePath("/admin");
  revalidatePath("/admin/work");
  revalidatePath(`/admin/work/${projectId}`);
  revalidatePath("/admin/billing");
}

/** The client signs off a completed milestone. If it carries an amount, a DRAFT invoice is made for staff to review and send. */
export async function approveMilestone(milestoneId: string): Promise<PortalWorkResult> {
  return guard(async () => {
    const user = await requireClientAction();
    if (await rateLimited("milestone-approve", 20, 60_000)) return fail("Too many attempts. Wait a minute and try again.");
    const m = await prisma.milestone.findFirst({ where: { id: milestoneId, project: { userId: user.id } }, include: { project: { select: { id: true, title: true } } } });
    if (!m || !m.requiresApproval) return fail("Milestone not found.");
    if (!m.completedAt) return fail("This milestone is not ready for approval yet.");
    if (m.approvedAt) return fail("You already approved this milestone.");

    const settings = await getBillingSettings();
    const result = await prisma.$transaction(async (tx) => {
      // Conditional update so two clicks cannot approve (and invoice) twice.
      const claim = await tx.milestone.updateMany({ where: { id: m.id, approvedAt: null }, data: { approvedAt: new Date(), approvedBy: user.name } });
      if (!claim.count) return null;
      if (m.billAmount <= 0) return { invoice: null };
      const number = await nextNumber(tx, "invoice");
      const inv = await tx.invoice.create({
        data: {
          number, token: randomBytes(24).toString("base64url"), userId: user.id, projectId: m.project.id, title: `${m.project.title}: ${m.title}`,
          currency: settings.defaultCurrency, taxBp: settings.defaultTaxBp, dueDate: new Date(Date.now() + settings.defaultDueDays * 86_400_000),
          items: { create: [{ description: `Milestone approved: ${m.title}`.slice(0, 300), quantity: 1, unitAmount: m.billAmount, position: 0 }] },
        },
      });
      await tx.milestone.update({ where: { id: m.id }, data: { invoiceId: inv.id } });
      return { invoice: inv };
    });
    if (!result) return fail("You already approved this milestone.");

    await logActivity({ userId: null, action: "updated", entityType: "ClientProject", entityId: m.project.id, message: `${user.name} approved milestone "${m.title}"${result.invoice ? ` (draft invoice ${result.invoice.number})` : ""}` });
    const site = await getSiteSettings();
    await sendMail({
      to: notifyEmail(site.contactEmail),
      subject: `Milestone approved: ${m.title} (${m.project.title})`,
      text: `${user.name} approved "${m.title}" on ${m.project.title}.${result.invoice ? `\n\nA draft invoice ${result.invoice.number} for ${formatMoney(m.billAmount, settings.defaultCurrency)} was created. Review and send it:\n${siteUrl()}/admin/billing/invoices/${result.invoice.id}` : ""}\n\n${siteUrl()}/admin/work/${m.project.id}`,
    });
    refresh(m.project.id);
    return { success: true, message: "Thank you. The milestone is approved." };
  });
}

export async function postClientComment(projectId: string, body: string): Promise<PortalWorkResult> {
  return guard(async () => {
    const user = await requireClientAction();
    if (await rateLimited("project-comment", 15, 60_000)) return fail("Too many messages. Wait a minute and try again.");
    const text = body.trim();
    if (!text) return fail("Write a message first.");
    if (text.length > 4000) return fail("Keep it under 4000 characters.");
    const p = await prisma.clientProject.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, title: true } });
    if (!p) return fail("Project not found.");
    await prisma.projectComment.create({ data: { projectId, userId: user.id, authorName: user.name, fromClient: true, body: text } });
    const site = await getSiteSettings();
    await sendMail({ to: notifyEmail(site.contactEmail), replyTo: user.email, subject: `${user.company || user.name} wrote on ${p.title}`, text: `${text}\n\n${siteUrl()}/admin/work/${p.id}` });
    refresh(projectId);
    return { success: true, message: "Message sent." };
  });
}

/** A request from the client. It lands on the board as an unassigned, client-visible task for staff to triage. */
export async function requestWork(projectId: string, input: { title: string; details: string }): Promise<PortalWorkResult> {
  return guard(async () => {
    const user = await requireClientAction();
    if (await rateLimited("project-request", 10, 60_000)) return fail("Too many requests. Wait a minute and try again.");
    const title = input.title.trim();
    if (title.length < 3 || title.length > 160) return fail("Describe the request in a few words (3 to 160 characters).");
    const p = await prisma.clientProject.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, title: true, status: true } });
    if (!p) return fail("Project not found.");
    if (p.status === "DONE") return fail("This project is finished. Please raise a support request or contact us.");
    await prisma.task.create({ data: { projectId, title, description: input.details.trim().slice(0, 4000), fromClient: true, clientVisible: true } });
    const site = await getSiteSettings();
    await sendMail({ to: notifyEmail(site.contactEmail), replyTo: user.email, subject: `New request on ${p.title}: ${title}`, text: `${user.company || user.name} asked for:\n\n${title}\n\n${input.details.trim().slice(0, 1000)}\n\nIt is waiting for triage on the board:\n${siteUrl()}/admin/work/${p.id}` });
    refresh(projectId);
    return { success: true, message: "Request sent. We will review it and get back to you." };
  });
}
