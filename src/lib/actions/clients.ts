"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { isValidPhone, normalizeWebsite } from "@/lib/phone";
import { provisionClient } from "@/lib/client-provision";
import { createMonthlyReport } from "@/lib/report";
import { ASSET_TYPES, DOC_KINDS, ticketRef } from "@/lib/portal";
import { monitorTarget } from "@/lib/automation";

export type ClientState = { success: boolean; message: string; inviteLink?: string; emailed?: boolean };

const optional = (max: number) => z.string().trim().max(max).default("");

const profileSchema = z.object({
  company: optional(120),
  jobTitle: optional(100),
  phone: optional(30).refine(isValidPhone, "Enter a valid phone number, for example 024 123 4567 or +233 24 123 4567."),
  whatsapp: optional(30).refine(isValidPhone, "Enter a valid WhatsApp number."),
  billingEmail: optional(160).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid billing email."),
  address: optional(300),
  city: optional(80),
  country: optional(80),
  website: optional(200),
  taxId: optional(60),
  industry: optional(80),
  source: optional(80),
  notes: optional(4000),
});

const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
}).extend(profileSchema.shape);

const PROFILE_KEYS = ["company", "jobTitle", "phone", "whatsapp", "billingEmail", "address", "city", "country", "website", "taxId", "industry", "source", "notes"] as const;

function readClientForm(formData: FormData) {
  const raw: Record<string, FormDataEntryValue | null> = { name: formData.get("name"), email: formData.get("email") };
  for (const k of PROFILE_KEYS) raw[k] = formData.get(k) ?? "";
  return clientSchema.safeParse(raw);
}

/** Website is stored with https:// added; an unusable address is a form error rather than silently dropped. */
function cleanWebsite(site: string): string | null {
  return normalizeWebsite(site);
}

export async function createClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const admin = await requireArea("orders");
  const parsed = readClientForm(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const website = cleanWebsite(parsed.data.website);
  if (website === null) return { success: false, message: "Enter a valid website address, for example example.com." };
  const res = await provisionClient({ ...parsed.data, website }, admin);
  if (!res.ok) return { success: false, message: res.message };
  revalidatePath("/admin/clients");
  return { success: true, message: res.message, inviteLink: res.link, emailed: res.emailed };
}

/** Edit a client's contact details. Email is the sign-in identity, so changing it checks for clashes. */
export async function updateClient(id: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  const admin = await requireArea("orders");
  const parsed = readClientForm(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const website = cleanWebsite(parsed.data.website);
  if (website === null) return { success: false, message: "Enter a valid website address, for example example.com." };
  if (!(await assertClient(id))) return { success: false, message: "Client not found." };
  const clash = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id } }, select: { id: true } });
  if (clash) return { success: false, message: "Another account already uses that email." };
  await prisma.user.update({ where: { id }, data: { ...parsed.data, website } });
  await logActivity({ userId: admin.id, action: "updated", entityType: "Client", entityId: id, message: `${admin.name ?? "Staff"} updated details for ${parsed.data.name}` });
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return { success: true, message: "Details saved." };
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
      monitorUrl: z.string().trim().max(300).default(""),
    })
    .safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      details: formData.get("details") ?? "",
      assignedTo: formData.get("assignedTo") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
      monitorUrl: formData.get("monitorUrl") ?? "",
    });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const { expiresAt, monitorUrl, ...rest } = parsed.data;
  const monitor = monitorTarget(monitorUrl);
  if (monitor === null) return { success: false, message: "Enter a valid website address to monitor, for example example.com." };
  const exp = expiresAt ? new Date(expiresAt) : null;
  if (exp && Number.isNaN(exp.getTime())) return { success: false, message: "Enter a valid expiry date." };
  await prisma.clientAsset.create({ data: { userId: clientId, ...rest, expiresAt: exp, monitorUrl: monitor } });
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

  const res = await provisionClient({ name: sub.name.trim().slice(0, 100) || email, email, company: "", phone: (sub.phone ?? "").slice(0, 30) }, admin);
  if (!res.ok) return { success: false, message: res.message };
  await prisma.contactSubmission.update({ where: { id: sub.id }, data: { clientId: res.id } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin/clients");
  return { success: true, message: res.message, clientId: res.id, inviteLink: res.link };
}
