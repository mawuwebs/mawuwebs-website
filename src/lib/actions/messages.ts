"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { sendMail, mailConfigured } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { statusLabel } from "@/lib/submission";

export type SubmissionStatusValue = "NEW" | "READ" | "RESPONDED" | "QUOTED" | "WON" | "LOST";
type Result = { success: boolean; message: string };

const STATUSES: SubmissionStatusValue[] = ["NEW", "READ", "RESPONDED", "QUOTED", "WON", "LOST"];
const isStatus = (s: string): s is SubmissionStatusValue => (STATUSES as string[]).includes(s);

function refresh() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

async function guard(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return { success: false, message };
  }
}

export async function saveSubmissionNotes(id: string, notes: string): Promise<Result> {
  return guard(async () => {
    await requireArea("orders");
    await prisma.contactSubmission.update({ where: { id }, data: { notes: notes.slice(0, 5000) } });
    refresh();
    return { success: true, message: "Notes saved." };
  });
}

export async function setSubmissionStatus(id: string, status: SubmissionStatusValue): Promise<Result> {
  return guard(async () => {
    const user = await requireArea("orders");
    if (!isStatus(status)) return { success: false, message: "Unknown status." };
    const s = await prisma.contactSubmission.update({ where: { id }, data: { status, statusChangedAt: new Date() } });
    // Opening a NEW enquiry marks it READ automatically; that is noise, not worth logging.
    if (status !== "READ") {
      await logActivity({
        userId: user.id,
        action: "updated",
        entityType: "Enquiry",
        entityId: id,
        message: `Marked enquiry from ${s.name} as ${statusLabel(status)}`,
      });
    }
    refresh();
    return { success: true, message: "Status updated." };
  });
}

/** Quote value and follow-up date, saved together from the detail panel. */
export async function saveSubmissionPipeline(
  id: string,
  input: { quoteAmount: string; followUpAt: string }
): Promise<Result> {
  return guard(async () => {
    const user = await requireArea("orders");
    const raw = input.quoteAmount.replace(/[^0-9.]/g, "");
    const quoteAmount = raw ? Math.round(Number(raw)) : null;
    if (quoteAmount !== null && (!Number.isFinite(quoteAmount) || quoteAmount > 100_000_000)) {
      return { success: false, message: "Enter a valid quote amount." };
    }
    let followUpAt: Date | null = null;
    if (input.followUpAt) {
      followUpAt = new Date(`${input.followUpAt}T09:00:00`);
      if (Number.isNaN(followUpAt.getTime())) return { success: false, message: "Enter a valid follow-up date." };
    }
    const s = await prisma.contactSubmission.update({ where: { id }, data: { quoteAmount, followUpAt } });
    await logActivity({
      userId: user.id,
      action: "updated",
      entityType: "Enquiry",
      entityId: id,
      message: `Updated quote / follow-up for ${s.name}`,
    });
    refresh();
    return { success: true, message: "Saved." };
  });
}

export async function saveLostReason(id: string, reason: string): Promise<Result> {
  return guard(async () => {
    const user = await requireArea("orders");
    const lostReason = reason.trim().slice(0, 100);
    const s = await prisma.contactSubmission.update({ where: { id }, data: { lostReason } });
    await logActivity({
      userId: user.id,
      action: "updated",
      entityType: "Enquiry",
      entityId: id,
      message: `Recorded lost reason for ${s.name}: ${lostReason || "cleared"}`,
    });
    refresh();
    return { success: true, message: "Reason saved." };
  });
}

/** Emails the enquirer from the admin and marks the lead as replied. */
export async function replyToSubmission(
  id: string,
  input: { subject: string; body: string }
): Promise<Result> {
  return guard(async () => {
    const user = await requireArea("orders");
    const subject = input.subject.trim().slice(0, 200);
    const body = input.body.trim().slice(0, 10_000);
    if (!subject || body.length < 2) return { success: false, message: "Write a subject and a message." };
    if (!mailConfigured()) {
      return { success: false, message: "Email isn't configured on the server. Use “Open in mail app” instead." };
    }
    const s = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!s) return { success: false, message: "Enquiry not found." };
    const settings = await getSiteSettings();
    const sent = await sendMail({ to: s.email, subject, text: body, replyTo: settings.contactEmail });
    if (!sent) return { success: false, message: "The email could not be sent. Check the SMTP settings." };

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    await prisma.contactSubmission.update({
      where: { id },
      data: {
        repliedAt: new Date(),
        status: s.status === "NEW" || s.status === "READ" ? "RESPONDED" : s.status,
        ...(s.status === "NEW" || s.status === "READ" ? { statusChangedAt: new Date() } : {}),
        notes: `${s.notes ? `${s.notes}\n\n` : ""}[${stamp}] Replied by ${user.name ?? "admin"}: ${subject}`.slice(0, 5000),
      },
    });
    await logActivity({
      userId: user.id,
      action: "replied",
      entityType: "Enquiry",
      entityId: id,
      message: `Replied to ${s.name} <${s.email}>`,
    });
    refresh();
    return { success: true, message: `Reply sent to ${s.email}.` };
  });
}

export async function bulkSetStatus(ids: string[], status: SubmissionStatusValue): Promise<Result> {
  return guard(async () => {
    const user = await requireArea("orders");
    if (!isStatus(status)) return { success: false, message: "Unknown status." };
    const list = ids.slice(0, 500);
    if (list.length === 0) return { success: false, message: "Nothing selected." };
    const { count } = await prisma.contactSubmission.updateMany({ where: { id: { in: list } }, data: { status, statusChangedAt: new Date() } });
    await logActivity({
      userId: user.id,
      action: "updated",
      entityType: "Enquiry",
      entityId: "bulk",
      message: `Marked ${count} enquir${count === 1 ? "y" : "ies"} as ${statusLabel(status)}`,
    });
    refresh();
    return { success: true, message: `${count} updated.` };
  });
}

// Deleting customer data is admin-only and always logged.
export async function deleteSubmission(id: string): Promise<Result> {
  return guard(async () => {
    const user = await requireAdmin();
    const s = await prisma.contactSubmission.delete({ where: { id } });
    await logActivity({
      userId: user.id,
      action: "deleted",
      entityType: "Enquiry",
      entityId: id,
      message: `Deleted enquiry from ${s.name} <${s.email}>`,
    });
    refresh();
    return { success: true, message: "Message deleted." };
  });
}

export async function bulkDeleteSubmissions(ids: string[]): Promise<Result> {
  return guard(async () => {
    const user = await requireAdmin();
    const list = ids.slice(0, 500);
    if (list.length === 0) return { success: false, message: "Nothing selected." };
    const { count } = await prisma.contactSubmission.deleteMany({ where: { id: { in: list } } });
    await logActivity({
      userId: user.id,
      action: "deleted",
      entityType: "Enquiry",
      entityId: "bulk",
      message: `Deleted ${count} enquir${count === 1 ? "y" : "ies"}`,
    });
    refresh();
    return { success: true, message: `${count} deleted.` };
  });
}

export async function deleteSubscriber(id: string): Promise<Result> {
  return guard(async () => {
    const user = await requireAdmin();
    const sub = await prisma.newsletterSubscriber.delete({ where: { id } });
    await logActivity({
      userId: user.id,
      action: "deleted",
      entityType: "Subscriber",
      entityId: id,
      message: `Removed newsletter subscriber ${sub.email}`,
    });
    revalidatePath("/admin/newsletter");
    return { success: true, message: "Subscriber removed." };
  });
}
