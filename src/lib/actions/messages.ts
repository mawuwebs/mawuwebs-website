"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";

export type SubmissionStatusValue = "NEW" | "READ" | "RESPONDED" | "QUOTED" | "WON" | "LOST";

export async function saveSubmissionNotes(id: string, notes: string) {
  await requireUser();
  await prisma.contactSubmission.update({ where: { id }, data: { notes: notes.slice(0, 5000) } });
  revalidatePath("/admin/messages");
  return { success: true, message: "Notes saved." };
}

export async function setSubmissionStatus(id: string, status: SubmissionStatusValue) {
  await requireUser();
  await prisma.contactSubmission.update({ where: { id }, data: { status } });
  revalidatePath("/admin/messages");
  return { success: true, message: "Status updated." };
}

export async function deleteSubmission(id: string) {
  await requireUser();
  await prisma.contactSubmission.delete({ where: { id } });
  revalidatePath("/admin/messages");
  return { success: true, message: "Message deleted." };
}

export async function deleteSubscriber(id: string) {
  await requireUser();
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
  return { success: true, message: "Subscriber removed." };
}
