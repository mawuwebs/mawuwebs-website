"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { BRIEF_TYPES, BRIEF_TIMELINES } from "@/lib/brief";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  company: z.string().trim().max(120).optional(),
  type: z.enum(BRIEF_TYPES, { message: "Pick what you need." }),
  timeline: z.enum(BRIEF_TIMELINES, { message: "Pick a timeline." }),
  budget: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20, "Give us a few sentences (at least 20 characters)."),
  link: z.string().trim().max(300).optional(),
  company_website: z.string().max(0).optional(),
});

export type BriefState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function submitProjectBrief(
  _prev: BriefState,
  formData: FormData
): Promise<BriefState> {
  if (await rateLimited("brief", 5, 10 * 60_000)) {
    return { success: false, message: "Too many submissions. Please try again in a few minutes." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    type: formData.get("type"),
    timeline: formData.get("timeline"),
    budget: formData.get("budget") || undefined,
    description: formData.get("description"),
    link: formData.get("link") || undefined,
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
  // Only trust a slug that matches a real service; anything else is ignored.
  const slug = String(formData.get("service") ?? "").slice(0, 120);
  const svc = slug ? await prisma.service.findUnique({ where: { slug }, select: { slug: true, title: true } }) : null;
  const message = [
    svc ? `Service: ${svc.title}` : null,
    `Project type: ${d.type}`,
    `Timeline: ${d.timeline}`,
    d.budget ? `Budget: ${d.budget}` : null,
    d.company ? `Company: ${d.company}` : null,
    d.link ? `Link: ${d.link}` : null,
    `\nAbout the project:\n${d.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, subject: "Project brief", kind: "brief", serviceSlug: svc?.slug ?? "", message },
    });
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[project-brief] could not save submission", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }

  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: d.email,
    subject: `New project brief: ${d.company || d.name}`,
    text: `From: ${d.name} <${d.email}>\n\n${message}`,
  });
  // Auto-reply so the visitor has a copy and knows what happens next.
  await sendMail({
    to: d.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `We got your project brief | ${settings.siteName}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nThanks for sending your project brief. A person on our team will read it and reply within one business day, usually with a few questions or a suggested next step.\n\nHere's a copy of what you sent:\n\n${message}\n\nIf anything is wrong or you want to add something, just reply to this email.\n\n${settings.siteName}`,
  });

  redirect("/start-a-project/thanks");
}
