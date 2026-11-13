"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recordSlugRedirect } from "@/lib/redirects";
import { requireAdmin, requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { parseSchedule, saveRevision } from "@/lib/revisions";

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
  scheduledAt: z.string().trim().optional(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  metaKeywords: z.string().trim().optional(),
  noIndex: z.boolean(),
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
    scheduledAt: formData.get("scheduledAt") || undefined,
    metaTitle: formData.get("metaTitle"),
    metaDescription: formData.get("metaDescription"),
    metaKeywords: formData.get("metaKeywords"),
    noIndex: formData.get("noIndex") === "on",
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
  const user = await requireArea("content");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const { tagIds, categoryId, scheduledAt: rawSchedule, ...data } = parsed.data;
  const schedule = parseSchedule(rawSchedule, data.status);
  if (schedule.error) {
    return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };
  }
  const post = await prisma.post.create({
    data: {
      ...data,
      scheduledAt: schedule.value,
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
  const user = await requireArea("content");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== id) {
    return { success: false, message: "That slug is already in use.", fieldErrors: { slug: "This slug is already taken." } };
  }

  const current = await prisma.post.findUnique({ where: { id } });
  if (current?.deletedAt) {
    return { success: false, message: "This post is in the trash. Restore it before editing." };
  }
  const { tagIds, categoryId, scheduledAt: rawSchedule, ...data } = parsed.data;
  const schedule = parseSchedule(rawSchedule, data.status);
  if (schedule.error) {
    return { success: false, message: schedule.error, fieldErrors: { scheduledAt: schedule.error } };
  }
  await saveRevision("post", id, user.name ?? "Admin");
  if (current && current.slug !== data.slug)
    await recordSlugRedirect("/blog", current.slug, data.slug);
  const post = await prisma.post.update({
    where: { id },
    data: {
      ...data,
      scheduledAt: schedule.value,
      categoryId: categoryId || null,
      tags: { set: tagIds.map((tid) => ({ id: tid })) },
      publishedAt:
        data.status === "PUBLISHED" ? (schedule.value ?? current?.publishedAt ?? new Date()) : null,
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

/** Moves a post to the trash (hidden everywhere, restorable). */
export async function deletePost(id: string) {
  const user = await requireArea("content");
  const post = await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Post",
    entityId: id,
    message: `Moved blog post "${post.title}" to the trash`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return { success: true, message: "Post moved to trash." };
}

export async function restorePost(id: string) {
  const user = await requireArea("content");
  const post = await prisma.post.update({ where: { id }, data: { deletedAt: null } });

  await logActivity({
    userId: user.id,
    action: "restored",
    entityType: "Post",
    entityId: id,
    message: `Restored blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return { success: true, message: "Post restored." };
}

/** Permanent delete, only from the trash and only for admins. */
export async function purgePost(id: string) {
  const user = await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post?.deletedAt) return { success: false, message: "Only trashed posts can be deleted permanently." };
  await prisma.post.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Post",
    entityId: id,
    message: `Permanently deleted blog post "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  return { success: true, message: "Post deleted permanently." };
}

export async function togglePostStatus(id: string) {
  const user = await requireArea("content");
  const post = await prisma.post.findUniqueOrThrow({ where: { id } });
  if (post.deletedAt) return { success: false, message: "This post is in the trash. Restore it first." };
  const nextStatus = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.post.update({
    where: { id },
    data: {
      status: nextStatus,
      scheduledAt: null,
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
