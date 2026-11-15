"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { scoreEstimate } from "@/lib/estimate";
import { getEstimateConfig } from "@/lib/form-config";

const schema = z.object({
  type: z.string().max(300, "That is too long.").min(1),
  size: z.string().max(300, "That is too long.").optional(), // not asked for IT services
  features: z.array(z.string()).max(40).default([]),
  timeline: z.string().max(300, "That is too long.").min(1),
  name: z.string().trim().max(300, "That is too long.").min(2, "Please enter your name."),
  email: z.string().trim().max(300, "That is too long.").email("Enter a valid email address."),
  notes: z.string().trim().max(2000).optional(),
  company_website: z.string().max(0).optional(),
});

export type EstimateState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const label = (list: { id: string; label: string }[], id: string) =>
  list.find((o) => o.id === id)?.label ?? id;

export async function submitEstimate(
  _prev: EstimateState,
  formData: FormData
): Promise<EstimateState> {
  if (await rateLimited("estimate", 5, 10 * 60_000)) {
    return { success: false, message: "Too many requests. Please try again in a few minutes." };
  }
  const parsed = schema.safeParse({
    type: formData.get("type"),
    size: formData.get("size") || undefined,
    features: formData.getAll("features").map(String),
    timeline: formData.get("timeline"),
    name: formData.get("name"),
    email: formData.get("email"),
    notes: formData.get("notes") || undefined,
    company_website: formData.get("company_website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false, message: "Please check the highlighted fields.", fieldErrors };
  }

  const d = parsed.data;
  // The lists are edited in the admin, so check every answer against what's live now.
  const cfg = await getEstimateConfig();
  const known = (list: { id: string }[], id?: string) => !id || list.some((o) => o.id === id);
  if (!known(cfg.types, d.type) || !known(cfg.sizes, d.size) || !known(cfg.timelines, d.timeline) || !d.features.every((f) => known(cfg.features, f))) {
    return { success: false, message: "The options changed while you were filling this in. Please reload the page and try again." };
  }
  const { tier } = scoreEstimate({ type: d.type, size: d.size, features: d.features }, cfg);
  const message = [
    `Project type: ${label(cfg.types, d.type)}`,
    ...(d.size
      ? [
          `Size: ${label(cfg.sizes, d.size)}`,
          `Features: ${d.features.length ? d.features.map((f) => label(cfg.features, f)).join(", ") : "None selected"}`,
        ]
      : []),
    `Timeline: ${label(cfg.timelines, d.timeline)}`,
    `Indicative tier shown to visitor: ${tier.name} (${tier.weeks})`,
    d.notes ? `\nNotes:\n${d.notes}` : "",
  ].join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, subject: "Project estimate", kind: "estimate", message },
    });
    const settings = await getSiteSettings();
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      replyTo: d.email,
      subject: `New estimate request: ${d.name}`,
      text: `From: ${d.name} <${d.email}>\n\n${message}`,
    });
    await sendMail({
      to: d.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `We received your project estimate request | ${settings.siteName}`,
      text: `Hi ${d.name.split(" ")[0]},\n\nThanks for using our estimate tool. We'll reply with a few questions and a written quote.\n\nWhat you told us:\n\n${message}\n\nThe tier shown on screen is a rough guide, not a quote.\n\n${settings.siteName}`,
    });
    return { success: true, message: "Sent. We'll reply with questions and a written quote." };
  } catch (err) {
    // Never lose a lead silently: the server log is the only place a failed save shows up.
    console.error("[estimate] could not save submission", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
