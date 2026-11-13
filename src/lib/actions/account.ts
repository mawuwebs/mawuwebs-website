"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/require-admin";
import { rateLimited } from "@/lib/rate-limit";
import { sniffImage } from "@/lib/image-sniff";
import { logActivity } from "@/lib/activity-log";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { generateRecoveryCodes, generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";

export type AccountState = { success: boolean; message: string };

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ---------- Signed-in account actions ----------

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await requireUser({ allowPasswordChange: true });
  if (await rateLimited(`pwchange:${session.id}`, 5, 15 * 60_000)) {
    return { success: false, message: "Too many attempts. Try again in a few minutes." };
  }
  const current = String(formData.get("current") ?? "");
  const next = passwordSchema.safeParse(formData.get("next"));
  if (!next.success) return { success: false, message: next.error.issues[0].message };
  if (next.data !== String(formData.get("confirm") ?? "")) {
    return { success: false, message: "The new passwords don't match." };
  }
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { success: false, message: "Your current password is incorrect." };
  }
  if (await bcrypt.compare(next.data, user.passwordHash)) {
    return { success: false, message: "Choose a password you haven't used here before." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next.data, 10), passwordChangedAt: new Date(), mustChangePassword: false },
  });
  await logActivity({ userId: user.id, action: "updated", entityType: "User", entityId: user.id, message: `${user.name} changed their password` });
  // Every session issued before now is now invalid, including this one.
  await signOut({ redirectTo: user.role === "CLIENT" ? "/portal/login?reset=1" : "/admin/login?reset=1" });
  return { success: true, message: "Password changed." };
}

/** Step 1 of enabling 2FA: make a secret and QR code. Nothing is enforced until confirmed. */
export async function beginTotpSetup() {
  const session = await requireUser({ allowPasswordChange: true });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (user.totpEnabled) return { success: false as const, message: "Two-factor authentication is already on." };
  const secret = generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
  const settings = await getSiteSettings();
  const uri = otpauthUri(secret, user.email, settings.siteName);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { success: true as const, secret, qr };
}

/** Step 2: prove the app works by entering a code. Returns one-time recovery codes. */
export async function confirmTotpSetup(code: string) {
  const session = await requireUser({ allowPasswordChange: true });
  if (await rateLimited(`totp-setup:${session.id}`, 10, 15 * 60_000)) {
    return { success: false as const, message: "Too many attempts. Try again in a few minutes." };
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (user.totpEnabled || !user.totpSecret) return { success: false as const, message: "Start the setup again." };
  const step = verifyTotp(user.totpSecret, code);
  if (step === null) return { success: false as const, message: "That code didn't match. Check the time on your phone and try again." };
  const { codes, hashes } = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpLastStep: step, recoveryCodes: JSON.stringify(hashes) },
  });
  await logActivity({ userId: user.id, action: "updated", entityType: "User", entityId: user.id, message: `${user.name} turned on two-factor authentication` });
  return { success: true as const, message: "Two-factor authentication is on.", recoveryCodes: codes };
}

export async function disableTotp(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await requireUser({ allowPasswordChange: true });
  if (await rateLimited(`totp-off:${session.id}`, 5, 15 * 60_000)) {
    return { success: false, message: "Too many attempts. Try again in a few minutes." };
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { success: false, message: "Your password is incorrect." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpLastStep: null, recoveryCodes: "[]" },
  });
  await logActivity({ userId: user.id, action: "updated", entityType: "User", entityId: user.id, message: `${user.name} turned off two-factor authentication` });
  return { success: true, message: "Two-factor authentication is off." };
}

// ---------- Forgotten password (signed out) ----------

/** Always answers the same way, so it can't be used to find out which emails have accounts. */
export async function requestPasswordReset(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const generic: AccountState = {
    success: true,
    message: "If an account exists for that email, a reset link is on its way. It works for one hour.",
  };
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if ((await rateLimited("forgot", 5, 15 * 60_000)) || (await rateLimited(`forgot:${email}`, 3, 60 * 60_000))) {
    return { success: false, message: "Too many requests. Please try again later." };
  }
  if (!email) return { success: false, message: "Enter your email address." };

  const user = await prisma.user.findFirst({ where: { email: { equals: email } } });
  if (!user) return generic;

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });

  const settings = await getSiteSettings();
  const link = `${siteUrl()}/admin/reset-password?token=${token}`;
  if (!mailConfigured()) {
    console.warn("[auth] Password reset requested but SMTP isn't configured. Use `npm run admin:password` instead.");
    return generic;
  }
  await sendMail({
    to: user.email,
    subject: `Reset your ${settings.siteName} admin password`,
    text: `Hi ${user.name.split(" ")[0]},\n\nSomeone asked to reset the admin password for ${settings.siteName}. Use this link within one hour:\n\n${link}\n\nIf this wasn't you, ignore this email. Your password stays the same.`,
  });
  return generic;
}

export async function resetPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  if (await rateLimited("reset", 10, 15 * 60_000)) {
    return { success: false, message: "Too many attempts. Please try again later." };
  }
  const token = String(formData.get("token") ?? "");
  const next = passwordSchema.safeParse(formData.get("next"));
  if (!next.success) return { success: false, message: next.error.issues[0].message };
  if (next.data !== String(formData.get("confirm") ?? "")) {
    return { success: false, message: "The passwords don't match." };
  }
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return { success: false, message: "This reset link is invalid or has expired. Request a new one." };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash: await bcrypt.hash(next.data, 10), passwordChangedAt: new Date(), mustChangePassword: false },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: rec.userId } }),
  ]);
  await logActivity({ userId: rec.userId, action: "updated", entityType: "User", entityId: rec.userId, message: "Password reset by email link" });
  const who = await prisma.user.findUnique({ where: { id: rec.userId }, select: { role: true } });
  redirect(who?.role === "CLIENT" ? "/portal/login?reset=1" : "/admin/login?reset=1");
}

// ---------- Own profile ----------

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX = 2 * 1024 * 1024;
const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

async function removeAvatarFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/avatars/")) return;
  try {
    await unlink(path.join(AVATAR_DIR, path.basename(url)));
  } catch {}
}

export async function uploadAvatar(formData: FormData): Promise<AccountState & { url?: string }> {
  const session = await requireUser({ allowPasswordChange: true });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Choose an image first." };
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return { success: false, message: "Use a JPG, PNG or WEBP image." };
  if (file.size > AVATAR_MAX) return { success: false, message: "Image is too large. Maximum is 2MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (sniffImage(buffer) !== file.type) return { success: false, message: "That file isn't a valid image." };

  await mkdir(AVATAR_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(AVATAR_DIR, filename), buffer);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { image: true } });
  const url = `/uploads/avatars/${filename}`;
  await prisma.user.update({ where: { id: session.id }, data: { image: url } });
  await removeAvatarFile(user.image);
  revalidatePath("/admin", "layout");
  return { success: true, message: "Photo updated.", url };
}

export async function removeAvatar(): Promise<AccountState> {
  const session = await requireUser({ allowPasswordChange: true });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { image: true } });
  await prisma.user.update({ where: { id: session.id }, data: { image: null } });
  await removeAvatarFile(user.image);
  revalidatePath("/admin", "layout");
  return { success: true, message: "Photo removed." };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
});

/** Changing the email needs the current password, because it is the sign-in identity. */
export async function updateOwnProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await requireUser({ allowPasswordChange: true });
  if (await rateLimited(`profile:${session.id}`, 10, 15 * 60_000)) {
    return { success: false, message: "Too many attempts. Try again in a few minutes." };
  }
  const parsed = profileSchema.safeParse({ name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  const emailChanged = parsed.data.email !== user.email;
  if (emailChanged) {
    if (!(await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash))) {
      return { success: false, message: "Enter your current password to change your email." };
    }
    const clash = await prisma.user.findFirst({ where: { email: parsed.data.email, id: { not: user.id } } });
    if (clash) return { success: false, message: "That email is already in use." };
  }
  if (parsed.data.name === user.name && !emailChanged) return { success: true, message: "Nothing to change." };

  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "User",
    entityId: user.id,
    message: `${user.name} updated their profile${emailChanged ? " (email changed)" : ""}`,
  });
  revalidatePath("/admin", "layout");
  if (emailChanged) {
    const settings = await getSiteSettings();
    await sendMail({
      to: user.email,
      subject: `Your ${settings.siteName} admin email was changed`,
      text: `Hi ${user.name.split(" ")[0]},\n\nThe sign-in email on your admin account was changed to ${parsed.data.email}.\n\nIf this wasn't you, contact your site administrator right away.`,
    });
  }
  return { success: true, message: "Profile saved." };
}
