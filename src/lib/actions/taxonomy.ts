"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";
import { toSlug } from "@/lib/slug";

export type TaxonomyState = {
  success: boolean;
  message: string;
};

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  type: z.enum(["POST", "PROJECT"]),
});

export async function createCategory(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  await requireUser();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const slug = toSlug(parsed.data.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return { success: false, message: "A category with that name already exists." };

  await prisma.category.create({ data: { ...parsed.data, slug } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Category added." };
}

export async function renameCategory(id: string, name: string): Promise<TaxonomyState> {
  await requireUser();
  const parsed = z.string().trim().min(2).safeParse(name);
  if (!parsed.success) return { success: false, message: "Name must be at least 2 characters." };

  const slug = toSlug(parsed.data);
  await prisma.category.update({ where: { id }, data: { name: parsed.data, slug } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Category updated." };
}

export async function deleteCategory(id: string): Promise<TaxonomyState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { success: false, message: "Only admins can delete this." };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Category deleted." };
}

const tagSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
});

export async function createTag(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  await requireUser();
  const parsed = tagSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const slug = toSlug(parsed.data.name);
  const existing = await prisma.tag.findUnique({ where: { slug } });
  if (existing) return { success: false, message: "A tag with that name already exists." };

  await prisma.tag.create({ data: { name: parsed.data.name, slug } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Tag added." };
}

export async function renameTag(id: string, name: string): Promise<TaxonomyState> {
  await requireUser();
  const parsed = z.string().trim().min(2).safeParse(name);
  if (!parsed.success) return { success: false, message: "Name must be at least 2 characters." };

  const slug = toSlug(parsed.data);
  await prisma.tag.update({ where: { id }, data: { name: parsed.data, slug } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Tag updated." };
}

export async function deleteTag(id: string): Promise<TaxonomyState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { success: false, message: "Only admins can delete this." };
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true, message: "Tag deleted." };
}
