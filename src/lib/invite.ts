import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/mail";

export const INVITE_HOURS = 72;

/** One-time "choose your password" link. Replaces any earlier unused link for the user. */
export async function createInviteLink(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) },
  });
  return `${siteUrl()}/admin/reset-password?token=${token}`;
}
