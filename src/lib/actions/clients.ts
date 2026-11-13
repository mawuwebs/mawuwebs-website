"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { provisionClient } from "@/lib/client-provision";
import { createMonthlyReport } from "@/lib/report";
import { ASSET_TYPES, DOC_KINDS, ticketRef } from "@/lib/portal";

export type ClientState = { success: boolean; message: string; inviteLink?: string; emailed?: boolean };

const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  company: z.string().trim().max(120).default(""),
});

export async function createClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const admin = await requireArea("orders");
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") ?? "",
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const res = await provisionClient(parsed.data, admin);
  if (!res.ok) return { success: false, message: res.message };
  revalidatePath("/admin/clients");
  return { success: true, message: res.message, inviteLink: res.link, emailed: res.emailed };
}

export async function setClientDisabled(id: string, disabled: boolean): Promise<ClientState> {
  const admin = await requireArea("orders");
  const res = await prisma.user.updateMany({ where: { id, role: "CLIENT" }, data: { disabledAt: disabled ? new Date() : null } });
  if (!res.count) return { success: false, message: "Client not found." };
  await logActivity({ userId: admin.id, action: "updated", entityType: "Client", entityId: id, message: `${admin.name ?? "Staff"} ${disabled ? "disabled" : "re-enabled"} a client` });
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return { success: true, message: disabled ? "Access disabled." : "Access restored." };
}

async function assertClient(id: string) {
  return prisma.user.findFirst({ where: { id, role: "CLIENT" }, select: { id: true } });
}

export async function addAsset(clientId: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  await requireArea("orders");
  if (!(await assertClient(clientId))) return { success: false, message: "Client not found." };
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Give the item a name.").max(120),
      type: z.enum(ASSET_TYPES),
      details: z.string().trim().max(500).default(""),
      assignedTo: z.string().trim().max(120).default(""),
      expiresAt: z.string().trim().default(""),
    })
    .safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      details: formData.get("details") ?? "",
      assignedTo: formData.get("assignedTo") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
    });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const { expiresAt, ...rest } = parsed.data;
  const exp = expiresAt ? new Date(expiresAt) : null;
  if (exp && Number.isNaN(exp.getTime())) return { success: false, message: "Enter a valid expiry date." };
  await prisma.clientAsset.create({ data: { userId: clientId, ...rest, expiresAt: exp } });
  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true, message: "Added." };
}

export async function deleteAsset(id: string, clientId: string) {
  await requireArea("orders");
  await prisma.clientAsset.deleteMany({ where: { id, userId: clientId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function addDocument(clientId: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  await requireArea("orders");
  if (!(await assertClient(clientId))) return { success: false, message: "Client not found." };
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Give the document a title.").max(140),
      kind: z.enum(DOC_KINDS),
      url: z.string().trim().max(500).default(""),
      body: z.string().trim().max(20000).default(""),
    })
    .safeParse({ title: formData.get("title"), kind: formData.get("kind"), url: formData.get("url") ?? "", body: formData.get("body") ?? "" });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const { url, ...rest } = parsed.data;
  // Only https links or files uploaded to the media library: never javascript: or data: URLs.
  if (url && !/^https:\/\//i.test(url) && !url.startsWith("/uploads/")) {
    return { success: false, message: "The link must start with https:// or be a media library path (/uploads/...)." };
  }
  if (!url && !rest.body) return { success: false, message: "Add a link or some text." };
  await prisma.clientDocument.create({ data: { userId: clientId, ...rest, url: url || null } });
  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true, message: "Shared with the client." };
}

export async function deleteDocument(id: string, clientId: string) {
  await requireArea("orders");
  await prisma.clientDocument.deleteMany({ where: { id, userId: clientId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function generateReportNow(clientId: string): Promise<ClientState> {
  await requireArea("orders");
  if (!(await assertClient(clientId))) return { success: false, message: "Client not found." };
  // offset 0 = this month so far, useful for a mid-month update; the cron job does last month.
  const doc = await createMonthlyReport(clientId, { offset: 0 });
  revalidatePath(`/admin/clients/${clientId}`);
  return doc ? { success: true, message: "Report created and the client was emailed." } : { success: false, message: "A report for this month already exists." };
}

const replySchema = z.object({
  body: z.string().trim().min(2, "Write a message first.").max(4000),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"]),
  internal: z.boolean(),
});

export async function replyAsStaff(ticketId: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  const staff = await requireArea("orders");
  const parsed = replySchema.safeParse({ body: formData.get("body"), status: formData.get("status"), internal: formData.get("internal") === "on" });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { user: { select: { name: true, email: true } } } });
  if (!ticket) return { success: false, message: "Ticket not found." };

  await prisma.$transaction([
    prisma.ticketReply.create({ data: { ticketId, staffName: staff.name ?? "Support", body: parsed.data.body, internal: parsed.data.internal } }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status: parsed.data.status, resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null },
    }),
  ]);
  if (!parsed.data.internal) {
    const settings = await getSiteSettings();
    await sendMail({
      to: ticket.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Update on ${ticketRef(ticketId)}: ${ticket.subject}`,
      text: `Hi ${ticket.user.name.split(" ")[0]},\n\n${parsed.data.body}\n\nView or reply: ${siteUrl()}/portal/tickets/${ticketId}\n\n${settings.siteName}`,
    });
  }
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { success: true, message: "Saved." };
}

export type ConvertState = { success: boolean; message: string; clientId?: string; inviteLink?: string };

/** Turn an enquiry into a portal client (or link it to the client with the same email), so quotes and projects hang off one record. */
export async function convertSubmissionToClient(submissionId: string): Promise<ConvertState> {
  const admin = await requireArea("orders");
  const sub = await prisma.contactSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) return { success: false, message: "Enquiry not found." };
  if (sub.clientId) return { success: true, message: "Already a client.", clientId: sub.clientId };

  const email = sub.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role !== "CLIENT") return { success: false, message: "That email belongs to a staff account, so it cannot become a client." };
    await prisma.contactSubmission.update({ where: { id: sub.id }, data: { clientId: existing.id } });
    revalidatePath("/admin/messages");
    return { success: true, message: "Linked to the existing client.", clientId: existing.id };
  }

  const res = await provisionClient({ name: sub.name.trim().slice(0, 100) || email, email, company: "" }, admin);
  if (!res.ok) return { success: false, message: res.message };
  await prisma.contactSubmission.update({ where: { id: sub.id }, data: { clientId: res.id } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin/clients");
  return { success: true, message: res.message, clientId: res.id, inviteLink: res.link };
}
