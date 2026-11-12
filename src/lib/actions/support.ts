"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { getSupportConfig } from "@/lib/form-config";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(6, "A phone number helps us reach you fast.").max(30),
  company: z.string().trim().max(120).optional(),
  issue: z.string().trim().min(1, "Pick what the problem is about."),
  urgency: z.string().trim().min(1, "Tell us how urgent it is."),
  description: z.string().trim().min(10, "Describe the problem in a sentence or two."),
  company_website: z.string().max(0).optional(),
});

export type SupportState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitSupportRequest(
  _prev: SupportState,
  formData: FormData
): Promise<SupportState> {
  if (await rateLimited("support", 5, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please call us or try again in a few minutes." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company") || undefined,
    issue: formData.get("issue"),
    urgency: formData.get("urgency"),
    description: formData.get("description"),
    company_website: formData.get("company_website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && key !== "company_website" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const d = parsed.data;
  const cfg = await getSupportConfig();
  const level = cfg.urgency.find((u) => u.label === d.urgency);
  if (!cfg.issues.includes(d.issue) || !level) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: { [cfg.issues.includes(d.issue) ? "urgency" : "issue"]: "That option is no longer available. Pick another." },
    };
  }
  const urgent = level.urgent;
  const message = [
    `Issue: ${d.issue}`,
    `Urgency: ${d.urgency}`,
    d.company ? `Company: ${d.company}` : null,
    `\nWhat's happening:\n${d.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, phone: d.phone, subject: "Support request", kind: "support", urgent, message },
    });
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[support] could not save submission", err);
    return { success: false, message: "Something went wrong. Please call us or try again." };
  }

  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: d.email,
    subject: `${urgent ? "[URGENT] " : ""}Support request: ${d.issue} (${d.name})`,
    text: `From: ${d.name} <${d.email}>\nPhone: ${d.phone}\n\n${message}`,
  });
  await sendMail({
    to: d.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `We received your support request | ${settings.siteName}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nWe've received your support request and a technician will be in touch${settings.supportPromise ? `. ${settings.supportPromise}.` : " as soon as possible."}\n\n${urgent ? "Because you marked this as urgent, please also call us so we can start straight away.\n\n" : ""}What you told us:\n\n${message}\n\n${settings.siteName}`,
  });

  return {
    success: true,
    message: settings.supportPromise
      ? `Request received. ${settings.supportPromise}.`
      : "Request received. A technician will contact you shortly.",
  };
}
