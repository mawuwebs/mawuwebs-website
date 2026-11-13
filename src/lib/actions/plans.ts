"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { parseSchedule, saveRevision } from "@/lib/revisions";
import { featuresFromText } from "@/lib/plans";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(60),
  slug: z.string().trim().min(2, "Slug is required."),
  tagline: z.string().trim().max(120).default(""),
  forWho: z.string().trim().max(300).default(""),
  features: z.string().trim().min(1, "Add at least one feature (one per line)."),
  price: z.string().trim().max(80).optional(),
  highlight: z.coerce.boolean(),
  order: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  scheduledAt: z.string().trim().optional(),
});

export type PlanFormState = { success: boolean; message: string; fieldErrors?: Record<string, string> };

function parseForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    tagline: formData.get("tagline") ?? "",
    forWho: formData.get("forWho") ?? "",
    features: formData.get("features"),
    price: formData.get("price") || undefined,
    highlight: formData.get("highlight"),
    order: formData.get("order") || 0,
    status: formData.get("status"),
    scheduledAt: formData.get("scheduledAt") || undefined,
  });
}

function fieldErrorsFrom(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function refresh() {
  revalidatePath("/admin/plans");
  revalidatePath("/plans");
  revalidatePath("/plans/enquire");
}

/** Only one plan carries the "Most popular" ribbon. */
async function clearOtherHighlights(keepId: string) {
  await prisma.plan.updateMany({ where: { id: { not: keepId }, highlight: true }, data: { highlight: false } });
}

export async function createPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireArea("content");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  if (await prisma.plan.findUnique({ where: { slug: parsed.data.slug } })) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }
  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };

  const { features, scheduledAt: _unused, ...rest } = parsed.data;
  void _unused;
  const plan = await prisma.plan.create({
    data: {
      ...rest,
      price: rest.price || null,
      features: JSON.stringify(featuresFromText(features)),
      scheduledAt: schedule.value,
      publishedAt: rest.status === "PUBLISHED" ? new Date() : null,
    },
  });
  if (plan.highlight) await clearOtherHighlights(plan.id);
  await logActivity({ userId: user.id, action: "created", entityType: "plan", entityId: plan.id, message: `Created plan "${plan.name}"` });
  refresh();
  redirect("/admin/plans");
}

export async function updatePlan(id: string, _prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireArea("content");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const clash = await prisma.plan.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && clash.id !== id) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }
  const current = await prisma.plan.findUnique({ where: { id } });
  if (!current) return { success: false, message: "Plan not found." };
  if (current.deletedAt) return { success: false, message: "This plan is in the trash. Restore it before editing." };
  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };

  await saveRevision("plan", id, user.name ?? "Admin");
  const { features, scheduledAt: _unused, ...rest } = parsed.data;
  void _unused;
  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...rest,
      price: rest.price || null,
      features: JSON.stringify(featuresFromText(features)),
      scheduledAt: schedule.value,
      publishedAt: rest.status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : null,
    },
  });
  if (plan.highlight) await clearOtherHighlights(plan.id);
  await logActivity({ userId: user.id, action: "updated", entityType: "plan", entityId: plan.id, message: `Updated plan "${plan.name}"` });
  refresh();
  redirect("/admin/plans");
}

export async function togglePlanStatus(id: string) {
  const user = await requireArea("content");
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id } });
  if (plan.deletedAt) return { success: false, message: "This plan is in the trash. Restore it first." };
  const next = plan.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await prisma.plan.update({
    where: { id },
    data: { status: next, scheduledAt: null, publishedAt: next === "PUBLISHED" ? (plan.publishedAt ?? new Date()) : plan.publishedAt },
  });
  await logActivity({
    userId: user.id,
    action: next === "PUBLISHED" ? "published" : "unpublished",
    entityType: "plan",
    entityId: id,
    message: `${next === "PUBLISHED" ? "Published" : "Unpublished"} plan "${plan.name}"`,
  });
  refresh();
  return { success: true, message: `Plan ${next === "PUBLISHED" ? "published" : "unpublished"}.` };
}
