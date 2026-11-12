"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  slug: z.string().trim().min(2, "Slug is required."),
  description: z.string().trim().min(1, "Short description is required."),
  content: z.string().trim().min(1, "Content is required."),
  icon: z.string().trim().min(1),
  featuredImage: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
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
    featuredImage: formData.get("featuredImage"),
    status: formData.get("status"),
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

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
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
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...parsed.data,
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

export async function deleteService(id: string) {
  const user = await requireUser();
  const service = await prisma.service.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Service",
    entityId: id,
    message: `Deleted service "${service.title}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true, message: "Service deleted." };
}

export async function toggleServiceStatus(id: string) {
  const user = await requireUser();
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const nextStatus = service.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.service.update({
    where: { id },
    data: {
      status: nextStatus,
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
