import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { mailConfigured, sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { createInviteLink, INVITE_HOURS } from "@/lib/invite";

export type ProvisionResult =
  | { ok: true; id: string; link: string; emailed: boolean; message: string }
  | { ok: false; message: string };

/** Creates a CLIENT user, emails the portal invite and logs it. Shared by "Add client" and "Convert enquiry". */
export async function provisionClient(
  input: { name: string; email: string; company: string } & Partial<Record<"phone" | "whatsapp" | "jobTitle" | "billingEmail" | "address" | "city" | "country" | "website" | "taxId" | "industry" | "source" | "notes", string>>,
  admin: { id: string; name?: string | null }
): Promise<ProvisionResult> {
  if (process.env.NODE_ENV === "production" && (!process.env.AUTH_URL || /localhost|127\.0\.0\.1/.test(process.env.AUTH_URL))) {
    return { ok: false, message: "AUTH_URL is not set to your live site address, so invite links would point to the wrong place. Set AUTH_URL and try again." };
  }
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return { ok: false, message: "That email is already registered." };
  }
  const bcrypt = await import("bcryptjs");
  const user = await prisma.user.create({
    data: { ...input, role: "CLIENT", passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10) },
  });
  await logActivity({ userId: admin.id, action: "created", entityType: "Client", entityId: user.id, message: `${admin.name ?? "Staff"} added client ${user.name}` });

  const link = await createInviteLink(user.id);
  const settings = await getSiteSettings();
  const emailed = await sendMail({
    to: user.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `Your ${settings.siteName} client portal`,
    text: `Hi ${user.name.split(" ")[0]},\n\nYour client portal is ready. Raise support requests, see your projects, quotes and invoices, and download reports.\n\nChoose your password (the link works for ${INVITE_HOURS} hours):\n\n${link}\n\nAfter that, sign in at ${siteUrl()}/portal/login`,
  });
  return {
    ok: true,
    id: user.id,
    link,
    emailed,
    message: mailConfigured() && emailed ? "Client created and invite emailed." : "Client created. Share the invite link below.",
  };
}
