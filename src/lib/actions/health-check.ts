"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { getHealthCheckQuestions } from "@/lib/form-config";
import { parseAnswers, scoreAnswers, type Result } from "@/lib/health-check";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().min(2, "Tell us your company name.").max(120),
  company_website: z.string().max(0).optional(),
});

export type HealthCheckState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  result?: Result;
};

export async function submitHealthCheck(
  _prev: HealthCheckState,
  formData: FormData
): Promise<HealthCheckState> {
  if (await rateLimited("health-check", 5, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please try again in a few minutes." };
  }

  let rawAnswers: unknown = null;
  try {
    rawAnswers = JSON.parse(String(formData.get("answers") ?? ""));
  } catch {
    /* handled below */
  }
  const questions = await getHealthCheckQuestions();
  const answers = parseAnswers(rawAnswers, questions);
  if (!answers) return { success: false, message: "Please answer every question first." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    company: formData.get("company"),
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
  // Recomputed here from the raw answers, so the saved score can't be tampered with.
  const result = scoreAnswers(answers, questions);

  const label = { yes: "Yes", partly: "Partly", no: "No" } as const;
  const message = [
    `Company: ${d.company}`,
    `Score: ${result.score}/${questions.length * 2} (${result.percent}%) - ${result.band.label}`,
    `Weakest areas: ${[...result.areas].sort((a, b) => a.percent - b.percent).slice(0, 2).map((a) => `${a.area} ${a.percent}%`).join(", ")}`,
    "",
    "Answers:",
    ...questions.map((q) => `- ${q.text} ${label[answers[q.id]]}`),
  ].join("\n");

  try {
    await prisma.contactSubmission.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone || null,
        subject: `IT health check: ${result.band.label} (${result.percent}%)`,
        kind: "healthcheck",
        message,
      },
    });
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[health-check] could not save submission", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }

  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    replyTo: d.email,
    subject: `IT health check: ${result.band.label} ${result.percent}% (${d.company})`,
    text: `From: ${d.name} <${d.email}>${d.phone ? `\nPhone: ${d.phone}` : ""}\n\n${message}`,
  });

  const gapLines = result.gaps.slice(0, 6).map((g) => `- [${g.area}] ${g.gap}`).join("\n");
  await sendMail({
    to: d.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `Your IT health check result: ${result.band.label} | ${settings.siteName}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nYour score: ${result.percent}% (${result.band.label}).\n${result.band.summary}\n\n${
      result.gaps.length ? `Top gaps:\n${gapLines}\n\n` : ""
    }We can walk you through these in a free 30-minute call, no obligation. Reply to this email or visit ${siteUrl()}/contact.\n\n${settings.siteName}`,
  });

  return { success: true, message: "Your result is ready.", result };
}
