"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  role: z.string().trim().optional(),
  company: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
  content: z.string().trim().min(10, "Testimonial content is required."),
  rating: z.coerce.number().int().min(1).max(5),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  order: z.coerce.number().int().default(0),
});

export type TestimonialFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    company: formData.get("company"),
    avatar: formData.get("avatar"),
    content: formData.get("content"),
    rating: formData.get("rating") || 5,
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

export async function createTestimonial(
  _prev: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const testimonial = await prisma.testimonial.create({ data: parsed.data });

  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Testimonial",
    entityId: testimonial.id,
    message: `Added testimonial from "${testimonial.name}"`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function updateTestimonial(
  id: string,
  _prev: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const testimonial = await prisma.testimonial.update({ where: { id }, data: parsed.data });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "Testimonial",
    entityId: testimonial.id,
    message: `Updated testimonial from "${testimonial.name}"`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function deleteTestimonial(id: string) {
  const user = await requireUser();
  const testimonial = await prisma.testimonial.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Testimonial",
    entityId: id,
    message: `Deleted testimonial from "${testimonial.name}"`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true, message: "Testimonial deleted." };
}

export async function toggleTestimonialStatus(id: string) {
  const user = await requireUser();
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const nextStatus = testimonial.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await prisma.testimonial.update({ where: { id }, data: { status: nextStatus } });

  await logActivity({
    userId: user.id,
    action: nextStatus === "PUBLISHED" ? "published" : "unpublished",
    entityType: "Testimonial",
    entityId: id,
    message: `${nextStatus === "PUBLISHED" ? "Published" : "Unpublished"} testimonial from "${testimonial.name}"`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true, message: `Testimonial ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}.` };
}
