"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { sendMail, notifyEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import {
  PROJECT_TYPES,
  SIZES,
  FEATURES,
  TIMELINES,
  scoreEstimate,
} from "@/lib/estimate";

const schema = z.object({
  type: z.string().min(1),
  size: z.string().optional(), // not asked for IT services
  features: z.array(z.string()).default([]),
  timeline: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
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
  const { tier } = scoreEstimate({ type: d.type, size: d.size, features: d.features });
  const message = [
    `Project type: ${label(PROJECT_TYPES, d.type)}`,
    ...(d.size
      ? [
          `Size: ${label(SIZES, d.size)}`,
          `Features: ${d.features.length ? d.features.map((f) => label(FEATURES, f)).join(", ") : "None selected"}`,
        ]
      : []),
    `Timeline: ${label(TIMELINES, d.timeline)}`,
    `Indicative tier shown to visitor: ${tier.name} (${tier.weeks})`,
    d.notes ? `\nNotes:\n${d.notes}` : "",
  ].join("\n");

  try {
    await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, subject: "Project estimate", message },
    });
    const settings = await getSiteSettings();
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      replyTo: d.email,
      subject: `New estimate request: ${d.name}`,
      text: `From: ${d.name} <${d.email}>\n\n${message}`,
    });
    return { success: true, message: "Sent. We'll reply with questions and a written quote." };
  } catch {
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
