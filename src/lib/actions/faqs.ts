"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  question: z.string().trim().min(3, "Question is required."),
  answer: z.string().trim().min(3, "Answer is required."),
  category: z.string().trim().min(1, "Category is required."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  order: z.coerce.number().int().default(0),
});

export type FaqFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return schema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    category: formData.get("category") || "General",
    status: formData.get("status"),
    order: formData.get("order") || 0,
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

export async function createFaq(
  _prev: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const faq = await prisma.faq.create({ data: parsed.data });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Faq",
    entityId: faq.id,
    message: `Added FAQ "${faq.question}"`,
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  redirect("/admin/faqs");
}

export async function updateFaq(
  id: string,
  _prev: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const faq = await prisma.faq.update({ where: { id }, data: parsed.data });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "Faq",
    entityId: faq.id,
    message: `Updated FAQ "${faq.question}"`,
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  redirect("/admin/faqs");
}

export async function deleteFaq(id: string) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { success: false, message: "Only admins can delete this." };
  const faq = await prisma.faq.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Faq",
    entityId: id,
    message: `Deleted FAQ "${faq.question}"`,
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return { success: true, message: "FAQ deleted." };
}

export async function toggleFaqStatus(id: string) {
  const user = await requireUser();
  const faq = await prisma.faq.findUniqueOrThrow({ where: { id } });
  const nextStatus = faq.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.faq.update({ where: { id }, data: { status: nextStatus } });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Faq",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} FAQ "${faq.question}"`,
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return { success: true, message: `FAQ ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
