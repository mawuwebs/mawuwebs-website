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
  description: z.string().trim().min(1, "Short description is required."),
  content: z.string().trim().min(1, "Content is required."),
  icon: z.string().trim().min(1),
  category: z.string().trim().min(1).default("Software & Web"),
  featuredImage: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  scheduledAt: z.string().trim().optional(),
  featured: z.coerce.boolean(),
  order: z.coerce.number().int().default(0),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  metaKeywords: z.string().trim().optional(),
});

export type ServiceFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    content: formData.get("content"),
    icon: formData.get("icon"),
    category: formData.get("category") || undefined,
    featuredImage: formData.get("featuredImage"),
    status: formData.get("status"),
    scheduledAt: formData.get("scheduledAt") || undefined,
    featured: formData.get("featured"),
    order: formData.get("order") || 0,
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

export async function createService(
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.service.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return {
      success: false,
      message: "That slug is already in use.",
      fieldErrors: { slug: "This slug is already taken." },
    };
  }

  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };

  const service = await prisma.service.create({
    data: {
      ...omitSchedule(parsed.data),
      scheduledAt: schedule.value,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Service",
    entityId: service.id,
    message: `Created service "${service.title}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect("/admin/services");
}

export async function updateService(
  id: string,
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.service.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== id) {
    return {
      success: false,
      message: "That slug is already in use.",
      fieldErrors: { slug: "This slug is already taken." },
    };
  }

  const current = await prisma.service.findUnique({ where: { id } });
  if (current?.deletedAt) return { success: false, message: "This item is in the trash. Restore it before editing." };
  const schedule = parseSchedule(parsed.data.scheduledAt, parsed.data.status);
  if (schedule.error) return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };
  await saveRevision("service", id, user.name ?? "Admin");
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...omitSchedule(parsed.data),
      scheduledAt: schedule.value,
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (current?.publishedAt ?? new Date())
          : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "Service",
    entityId: service.id,
    message: `Updated service "${service.title}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath(`/services/${service.slug}`);
  redirect("/admin/services");
}

export async function toggleServiceStatus(id: string) {
  const user = await requireUser();
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  if (service.deletedAt) return { success: false, message: "This item is in the trash. Restore it first." };
  const nextStatus = service.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.service.update({
    where: { id },
    data: {
      status: nextStatus,
      scheduledAt: null,
      publishedAt: nextStatus === "PUBLISHED" ? (service.publishedAt ?? new Date()) : service.publishedAt,
    },
  });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Service",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} service "${service.title}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true, message: `Service ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
