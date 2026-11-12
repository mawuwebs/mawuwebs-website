"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { omitSchedule, parseSchedule, saveRevision } from "@/lib/revisions";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  slug: z.string().trim().min(2, "Slug is required."),
  content: z.string().trim().min(1, "Content is required."),
  featuredImage: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  scheduledAt: z.string().trim().optional(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  metaKeywords: z.string().trim().optional(),
});

export type PageFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
    featuredImage: formData.get("featuredImage"),
    status: formData.get("status"),
    scheduledAt: formData.get("scheduledAt") || undefined,
    metaTitle: formData.get("metaTitle"),
    metaDescription: formData.get("metaDescription"),
    metaKeywords: formData.get("metaKeywords"),
  });
}

function fieldErrorsFrom(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key) errors[key] = issue.message;
  }
  return errors;
}

export async function createPage(
  _prev: PageFormState,
  formData: FormData
): Promise<PageFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.page.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };

  const page = await prisma.page.create({
    data: {
      ...omitSchedule(parsed.data),
      scheduledAt: schedule.value,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Page",
    entityId: page.id,
    message: `Created page "${page.title}"`,
  });

  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

export async function updatePage(
  id: string,
  _prev: PageFormState,
  formData: FormData
): Promise<PageFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.page.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== id) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const current = await prisma.page.findUnique({ where: { id } });
  if (current?.deletedAt) return { success: false, message: "This item is in the trash. Restore it before editing." };
  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };
  await saveRevision("page", id, user.name ?? "Admin");
  const page = await prisma.page.update({
    where: { id },
    data: {
      ...omitSchedule(parsed.data),
      scheduledAt: schedule.value,
      publishedAt:
        parsed.data.status === "PUBLISHED" ? (current?.publishedAt ?? new Date()) : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "Page",
    entityId: page.id,
    message: `Updated page "${page.title}"`,
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/${page.slug}`);
  redirect("/admin/pages");
}

export async function togglePageStatus(id: string) {
  const user = await requireUser();
  const page = await prisma.page.findUniqueOrThrow({ where: { id } });
  if (page.deletedAt) return { success: false, message: "This item is in the trash. Restore it first." };
  const nextStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.page.update({
    where: { id },
    data: {
      status: nextStatus,
      scheduledAt: null,
      publishedAt: nextStatus === "PUBLISHED" ? (page.publishedAt ?? new Date()) : page.publishedAt,
    },
  });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Page",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} page "${page.title}"`,
  });

  revalidatePath("/admin/pages");
  return { success: true, message: `Page ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
