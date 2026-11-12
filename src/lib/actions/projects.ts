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
  featuredImage: z.string().trim().optional(),
  gallery: z.string().trim().default("[]"),
  client: z.string().trim().optional(),
  projectUrl: z.string().trim().optional(),
  challenge: z.string().trim().default(""),
  solution: z.string().trim().default(""),
  results: z.string().default("[]"),
  year: z.string().trim().optional(),
  role: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  tagIds: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
  order: z.coerce.number().int().default(0),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  metaKeywords: z.string().trim().optional(),
});

export type ProjectFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  const rLabels = formData.getAll("resultLabel").map(String);
  const rValues = formData.getAll("resultValue").map(String);
  const results = rLabels
    .map((label, i) => ({ label: label.trim(), value: rValues[i]?.trim() ?? "" }))
    .filter((r) => r.label && r.value);

  const gallery = formData
    .getAll("gallery")
    .map((v) => v.toString().trim())
    .filter(Boolean);

  return schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    content: formData.get("content"),
    featuredImage: formData.get("featuredImage"),
    gallery: JSON.stringify(gallery),
    client: formData.get("client"),
    projectUrl: formData.get("projectUrl"),
    challenge: formData.get("challenge") ?? "",
    solution: formData.get("solution") ?? "",
    results: JSON.stringify(results),
    year: formData.get("year"),
    role: formData.get("role"),
    categoryId: formData.get("categoryId") || undefined,
    tagIds: formData.getAll("tagIds"),
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

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.project.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const { tagIds, categoryId, ...data } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...data,
      categoryId: categoryId || null,
      tags: { connect: tagIds.map((id) => ({ id })) },
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Project",
    entityId: project.id,
    message: `Created project "${project.title}"`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/portfolio");
  redirect("/admin/projects");
}

export async function updateProject(
  id: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.project.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== id) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const current = await prisma.project.findUnique({ where: { id } });
  const { tagIds, categoryId, ...data } = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      categoryId: categoryId || null,
      tags: { set: tagIds.map((tid) => ({ id: tid })) },
      publishedAt:
        data.status === "PUBLISHED" ? (current?.publishedAt ?? new Date()) : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "Project",
    entityId: project.id,
    message: `Updated project "${project.title}"`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/portfolio");
  revalidatePath(`/portfolio/${project.slug}`);
  redirect("/admin/projects");
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  const project = await prisma.project.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Project",
    entityId: id,
    message: `Deleted project "${project.title}"`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/portfolio");
  return { success: true, message: "Project deleted." };
}

export async function toggleProjectStatus(id: string) {
  const user = await requireUser();
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  const nextStatus = project.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.project.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === "PUBLISHED" ? (project.publishedAt ?? new Date()) : project.publishedAt,
    },
  });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Project",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} project "${project.title}"`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/portfolio");
  return { success: true, message: `Project ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
