"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { TOPICS, DAYS, WINDOWS, MODES } from "@/lib/booking";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(6, "A phone number helps us reach you.").max(30),
  company: z.string().trim().max(120).optional(),
  topic: z.enum(TOPICS, { message: "Pick a topic." }),
  mode: z.enum(MODES, { message: "Pick how you would like to talk." }),
  window: z.enum(WINDOWS, { message: "Pick a time of day." }),
  days: z.array(z.enum(DAYS)).min(1, "Pick at least one day."),
  notes: z.string().trim().max(1500).optional(),
  company_website: z.string().max(0).optional(),
});

export type BookingState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  if (await rateLimited("booking", 5, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please call us or try again in a few minutes." };
  }
  const values: Record<string, string> = {};
  for (const k of ["name", "email", "phone", "company", "topic", "mode", "window", "notes"]) values[k] = String(formData.get(k) ?? "");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company") || undefined,
    topic: formData.get("topic"),
    mode: formData.get("mode"),
    window: formData.get("window"),
    days: formData.getAll("days"),
    notes: formData.get("notes") || undefined,
    company_website: formData.get("company_website") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && key !== "company_website" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, message: "Please fix the highlighted fields.", fieldErrors, values };
  }
  const d = parsed.data;
  const message = [
    d.company ? `Company: ${d.company}` : null,
    `Topic: ${d.topic}`,
    `How: ${d.mode}`,
    `Preferred days: ${d.days.join(", ")}`,
    `Preferred time: ${d.window}`,
    d.notes ? `\nNotes:\n${d.notes}` : null,
  ].filter(Boolean).join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, phone: d.phone, subject: `Call request: ${d.topic}`, kind: "booking", message },
    });
  } catch (err) {
    console.error("[booking] could not save submission", err);
    return { success: false, message: "Something went wrong. Please call us or try again.", values };
  }

  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: d.email,
    subject: `Call request: ${d.topic} (${d.name})`,
    text: `From: ${d.name} <${d.email}>\nPhone: ${d.phone}\n\n${message}`,
  });
  await sendMail({
    to: d.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `We got your call request | ${settings.siteName}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nThanks. We'll confirm a time that matches your preferences within one business day.\n\nWhat you asked for:\n\n${message}\n\n${settings.siteName}`,
  });
  return { success: true, message: "Request received. We'll confirm a time within one business day." };
}
