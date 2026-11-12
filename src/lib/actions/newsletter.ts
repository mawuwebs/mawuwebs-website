"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, mailConfigured, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Honeypot
  company_website: z.string().max(0).optional(),
});

export type NewsletterState = {
  success: boolean;
  message: string;
};

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  if (await rateLimited("newsletter", 5, 10 * 60_000)) {
    return { success: false, message: "Too many attempts. Please try again in a few minutes." };
  }
  const parsed = schema.safeParse({
    email: formData.get("email"),
    company_website: formData.get("company_website") ?? "",
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const { email } = parsed.data;
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.confirmedAt) {
      return { success: true, message: "You're already subscribed. Thanks!" };
    }

    // Without SMTP we can't send a confirmation link, so confirm immediately.
    const autoConfirm = !mailConfigured();
    const token = existing?.token ?? randomBytes(16).toString("hex");
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { token },
      create: { email, token, confirmedAt: autoConfirm ? new Date() : null },
    });

    if (autoConfirm) {
      return { success: true, message: "You're subscribed! Thanks for joining us." };
    }

    const settings = await getSiteSettings();
    await sendMail({
      to: email,
      subject: `Confirm your subscription to ${settings.siteName}`,
      text: `Please confirm your email address to get our articles:\n\n${siteUrl()}/newsletter/confirm?token=${token}\n\nIf you didn't ask for this, ignore this email and you won't hear from us.`,
    });
    return { success: true, message: "Almost done: check your inbox for a confirmation link." };
  } catch {
    return { success: false, message: "Something went wrong. Please try again." };
  }
}

export async function confirmSubscription(token: string) {
  if (!token) return false;
  const res = await prisma.newsletterSubscriber.updateMany({
    where: { token, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });
  if (res.count > 0) return true;
  return Boolean(await prisma.newsletterSubscriber.findUnique({ where: { token } }));
}

export async function unsubscribe(token: string) {
  if (!token) return false;
  const res = await prisma.newsletterSubscriber.deleteMany({ where: { token } });
  return res.count > 0;
}
