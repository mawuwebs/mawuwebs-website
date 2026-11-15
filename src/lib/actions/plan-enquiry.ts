"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { TEAM_SIZES } from "@/lib/plans";
import { getPlans } from "@/lib/content";

const schema = z.object({
  plan: z.string().trim().max(300, "That is too long.").min(1, "Pick a plan."),
  name: z.string().trim().max(300, "That is too long.").min(2, "Please enter your name."),
  email: z.string().trim().max(300, "That is too long.").email("Enter a valid email address."),
  phone: z.string().trim().min(6, "A phone number helps us reach you.").max(30),
  company: z.string().trim().min(2, "Tell us your company name.").max(120),
  teamSize: z.enum(TEAM_SIZES, { message: "Pick your team size." }),
  devices: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
  company_website: z.string().max(0).optional(),
});

export type PlanEnquiryState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function submitPlanEnquiry(
  _prev: PlanEnquiryState,
  formData: FormData
): Promise<PlanEnquiryState> {
  if (await rateLimited("plan-enquiry", 5, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please call us or try again in a few minutes." };
  }

  const values: Record<string, string> = {};
  for (const k of ["plan", "name", "email", "phone", "company", "teamSize", "devices", "notes"]) {
    values[k] = String(formData.get(k) ?? "");
  }

  const parsed = schema.safeParse({
    plan: formData.get("plan"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    teamSize: formData.get("teamSize"),
    devices: formData.get("devices") || undefined,
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
  // Plans are edited in the admin, so check the choice against what is live right now.
  if (!(await getPlans()).some((p) => p.name === d.plan)) {
    return { success: false, message: "Please fix the highlighted fields.", fieldErrors: { plan: "That plan is no longer available. Pick another." }, values };
  }
  const message = [
    `Plan: ${d.plan}`,
    `Company: ${d.company}`,
    `Team size: ${d.teamSize}`,
    d.devices ? `Computers/devices: ${d.devices}` : null,
    d.notes ? `\nNotes:\n${d.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, phone: d.phone, subject: `Plan enquiry: ${d.plan}`, kind: "plan", message },
    });
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[plan-enquiry] could not save submission", err);
    return { success: false, message: "Something went wrong. Please call us or try again.", values };
  }

  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: d.email,
    subject: `Plan enquiry: ${d.plan} (${d.company})`,
    text: `From: ${d.name} <${d.email}>\nPhone: ${d.phone}\n\n${message}`,
  });
  await sendMail({
    to: d.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `We received your ${d.plan} plan enquiry | ${settings.siteName}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nThanks for asking about the ${d.plan} plan. We'll review what you have today and reply within one business day with a written recommendation and cost.\n\nWhat you told us:\n\n${message}\n\n${settings.siteName}`,
  });

  return { success: true, message: `Thanks. We'll reply about the ${d.plan} plan within one business day.` };
}
