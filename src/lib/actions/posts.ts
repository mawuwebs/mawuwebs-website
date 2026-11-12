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
  excerpt: z.string().trim().min(1, "Excerpt is required."),
  content: z.string().trim().min(1, "Content is required."),
  featuredImage: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  tagIds: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  metaKeywords: z.string().trim().optional(),
});

export type PostFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    featuredImage: formData.get("featuredImage"),
    categoryId: formData.get("categoryId") || undefined,
    tagIds: formData.getAll("tagIds"),
    status: formData.get("status"),
    featured: formData.get("featured"),
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

export async function createPost(
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const { tagIds, categoryId, ...data } = parsed.data;
  const post = await prisma.post.create({
    data: {
      ...data,
      categoryId: categoryId || null,
      authorId: user.id,
      tags: { connect: tagIds.map((id) => ({ id })) },
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Post",
    entityId: post.id,
    message: `Created blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function updatePost(
  id: string,
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== id) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const current = await prisma.post.findUnique({ where: { id } });
  const { tagIds, categoryId, ...data } = parsed.data;
  const post = await prisma.post.update({
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
    entityType: "Post",
    entityId: post.id,
    message: `Updated blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  redirect("/admin/posts");
}

export async function deletePost(id: string) {
  const user = await requireUser();
  const post = await prisma.post.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Post",
    entityId: id,
    message: `Deleted blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  return { success: true, message: "Post deleted." };
}

export async function togglePostStatus(id: string) {
  const user = await requireUser();
  const post = await prisma.post.findUniqueOrThrow({ where: { id } });
  const nextStatus = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.post.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === "PUBLISHED" ? (post.publishedAt ?? new Date()) : post.publishedAt,
    },
  });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Post",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  return { success: true, message: `Post ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
