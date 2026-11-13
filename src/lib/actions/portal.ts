"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { requireClientAction, ticketRef } from "@/lib/portal";

export type PortalState = { success: boolean; message: string };

const ticketSchema = z.object({
  subject: z.string().trim().min(4, "Give the request a short title.").max(140),
  body: z.string().trim().min(10, "Describe the problem in a sentence or two.").max(4000),
  urgent: z.boolean(),
});

export async function createTicket(_prev: PortalState, formData: FormData): Promise<PortalState> {
  const user = await requireClientAction();
  if (await rateLimited(`ticket:${user.id}`, 10, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please call us if it is urgent." };
  }
  const parsed = ticketSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    urgent: formData.get("urgent") === "on",
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const ticket = await prisma.ticket.create({ data: { userId: user.id, ...parsed.data } });
  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: user.email,
    subject: `${parsed.data.urgent ? "URGENT " : ""}Ticket ${ticketRef(ticket.id)}: ${parsed.data.subject} (${user.company || user.name})`,
    text: `From: ${user.name} <${user.email}>\n\n${parsed.data.body}\n\n${siteUrl()}/admin/tickets/${ticket.id}`,
  });
  revalidatePath("/portal/tickets");
  redirect(`/portal/tickets/${ticket.id}`);
}

export async function replyToTicket(ticketId: string, _prev: PortalState, formData: FormData): Promise<PortalState> {
  const user = await requireClientAction();
  if (await rateLimited(`ticket-reply:${user.id}`, 20, 10 * 60_000)) {
    return { success: false, message: "Too many messages. Please wait a few minutes." };
  }
  const body = z.string().trim().min(2, "Write a message first.").max(4000).safeParse(formData.get("body"));
  if (!body.success) return { success: false, message: body.error.issues[0].message };

  // Ownership check: a client can only touch their own tickets.
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket) return { success: false, message: "Request not found." };

  await prisma.$transaction([
    prisma.ticketReply.create({ data: { ticketId, body: body.data } }),
    // A client reply reopens a resolved request and hands the ball back to us.
    prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN", resolvedAt: null } }),
  ]);
  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: user.email,
    subject: `Reply on ${ticketRef(ticketId)}: ${ticket.subject}`,
    text: `${user.name}:\n\n${body.data}\n\n${siteUrl()}/admin/tickets/${ticketId}`,
  });
  revalidatePath(`/portal/tickets/${ticketId}`);
  return { success: true, message: "Sent." };
}
