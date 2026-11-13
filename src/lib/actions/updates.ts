"use server";

import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { verifyProgressToken } from "@/lib/unsubscribe";

export type UpdatesState = { done: boolean; message: string };

/** Public, but the signed link is the credential. Turns the weekly project progress emails off or back on. */
export async function setProgressEmails(userId: string, token: string, on: boolean): Promise<UpdatesState> {
  if (await rateLimited("progress-optout", 20, 60_000)) return { done: false, message: "Too many attempts. Wait a minute and try again." };
  if (!verifyProgressToken(userId, token)) return { done: false, message: "This link is not valid. Use the link in the latest email." };
  const res = await prisma.user.updateMany({ where: { id: userId, role: "CLIENT" }, data: { progressEmails: on } });
  if (!res.count) return { done: false, message: "We could not find your account." };
  return { done: true, message: on ? "Progress emails are back on." : "Done. You will no longer get weekly progress emails. You can still see progress in your portal." };
}
