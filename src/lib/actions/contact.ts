"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  message: z.string().trim().min(10, "Message should be at least 10 characters."),
  // Honeypot field — bots fill it, humans never see it.
  company_website: z.string().max(0).optional(),
});

export type ContactState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitContactForm(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  if (await rateLimited("contact", 5, 10 * 60_000)) {
    return { success: false, message: "Too many messages in a short time. Please try again in a few minutes." };
  }
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    company_website: formData.get("company_website"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && key !== "company_website") fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      message: "Please fix the errors below and try again.",
      fieldErrors,
    };
  }

  try {
    await prisma.contactSubmission.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        subject: parsed.data.subject || "",
        kind: "message",
        message: parsed.data.message,
      },
    });
    const settings = await getSiteSettings();
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      replyTo: parsed.data.email,
      subject: `New enquiry: ${parsed.data.subject || parsed.data.name}`,
      text: `From: ${parsed.data.name} <${parsed.data.email}>${parsed.data.phone ? `\nPhone: ${parsed.data.phone}` : ""}\n\n${parsed.data.message}`,
    });
    await sendMail({
      to: parsed.data.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `We received your message | ${settings.siteName}`,
      text: `Hi ${parsed.data.name.split(" ")[0]},\n\nThanks for getting in touch. We've received your message and will reply within one business day.\n\nYour message:\n\n${parsed.data.message}\n\n${settings.siteName}`,
    });
    return {
      success: true,
      message: "Thanks for reaching out! We'll get back to you within one business day.",
    };
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[contact] could not save submission", err);
    return {
      success: false,
      message: "Something went wrong while sending your message. Please try again.",
    };
  }
}
