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
  content: z.string().trim().min(1, "Content is required."),
  featuredImage: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
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

  const page = await prisma.page.create({
    data: {
      ...parsed.data,
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
  const page = await prisma.page.update({
    where: { id },
    data: {
      ...parsed.data,
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

export async function deletePage(id: string) {
  const user = await requireUser();
  const page = await prisma.page.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Page",
    entityId: id,
    message: `Deleted page "${page.title}"`,
  });

  revalidatePath("/admin/pages");
  return { success: true, message: "Page deleted." };
}

export async function togglePageStatus(id: string) {
  const user = await requireUser();
  const page = await prisma.page.findUniqueOrThrow({ where: { id } });
  const nextStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.page.update({
    where: { id },
    data: {
      status: nextStatus,
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
