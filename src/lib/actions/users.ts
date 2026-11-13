"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { ROLES, roleLabel, type StaffRole as Role } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";

export type UserResult = { success: boolean; message: string };

export type UserFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Present after a successful invite: the one-time link, in case email isn't set up or fails. */
  inviteLink?: string;
  emailed?: boolean;
};

const INVITE_HOURS = 72;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  role: z.enum(["ADMIN", "EDITOR", "CONTENT", "SUPPORT"]),
});

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function randomPassword() {
  return randomBytes(24).toString("base64url");
}

/** True when removing `id` from the active admins would leave none. */
async function isLastActiveAdmin(id: string) {
  const others = await prisma.user.count({
    where: { role: "ADMIN", disabledAt: null, id: { not: id } },
  });
  return others === 0;
}

/** In production an unset AUTH_URL would put localhost links in invite emails. */
function baseUrlProblem() {
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(siteUrl())) {
    return "AUTH_URL is not set to your live site address, so invite links would point to localhost. Set AUTH_URL and try again.";
  }
  return null;
}

/** Best-effort heads-up to the person affected. Silent when SMTP isn't set up. */
async function notify(to: string, name: string, subject: string, body: string) {
  const settings = await getSiteSettings();
  await sendMail({
    to,
    subject: `${subject} (${settings.siteName} admin)`,
    text: `Hi ${name.split(" ")[0]},\n\n${body}\n\nIf this wasn't expected, contact your site administrator.`,
  });
}

async function createInviteToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) },
  });
  return `${siteUrl()}/admin/reset-password?token=${token}`;
}

async function sendInviteEmail(user: { name: string; email: string; role: string }, link: string) {
  const settings = await getSiteSettings();
  return sendMail({
    to: user.email,
    subject: `You've been invited to the ${settings.siteName} admin`,
    text: `Hi ${user.name.split(" ")[0]},\n\nYou've been added to the ${settings.siteName} admin dashboard as: ${roleLabel(user.role as Role)}.\n\nChoose your password to get started (the link works for ${INVITE_HOURS} hours):\n\n${link}\n\nAfter that, sign in at ${siteUrl()}/admin/login`,
  });
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  await requireAdmin();
  const e = email.trim().toLowerCase();
  if (!z.string().email().safeParse(e).success) return true;
  return !(await prisma.user.findUnique({ where: { email: e }, select: { id: true } }));
}

export async function emailInviteAvailable() {
  await requireAdmin();
  return mailConfigured();
}

/** Create with a password the admin shares (mustChangePassword), or send an invite link. */
export async function createUserAccount(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requireAdmin();
  const bcrypt = await import("bcryptjs");
  const mode = formData.get("mode") === "invite" ? "invite" : "password";

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const password = String(formData.get("password") ?? "");
  if (mode === "password" && password.length < 10) {
    return {
      success: false,
      message: "Please fix the errors below.",
      fieldErrors: { password: "Use at least 10 characters." },
    };
  }

  if (mode === "invite") {
    const problem = baseUrlProblem();
    if (problem) return { success: false, message: problem };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      success: false,
      message: "That email is already in use.",
      fieldErrors: { email: "This email is already registered." },
    };
  }

  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash: await bcrypt.hash(mode === "password" ? password : randomPassword(), 10),
      mustChangePassword: mode === "password",
    },
  });
  await logActivity({
    userId: admin.id,
    action: "created",
    entityType: "User",
    entityId: user.id,
    message: `${admin.name ?? "An admin"} added ${user.name} as ${roleLabel(user.role).toLowerCase()}`,
  });
  revalidatePath("/admin/users");

  if (mode === "invite") {
    const link = await createInviteToken(user.id);
    const emailed = await sendInviteEmail(user, link);
    return { success: true, message: "Invite created.", inviteLink: link, emailed };
  }
  return { success: true, message: "User created." };
}

export async function resendInvite(id: string): Promise<UserResult & { link?: string; emailed?: boolean }> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { success: false, message: "User not found." };
  if (user.lastLoginAt) return { success: false, message: "This user has already signed in." };
  const problem = baseUrlProblem();
  if (problem) return { success: false, message: problem };
  const link = await createInviteToken(user.id);
  const emailed = await sendInviteEmail(user, link);
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: user.id,
    message: `Invite re-sent to ${user.name}`,
  });
  return {
    success: true,
    message: emailed ? `Invite emailed to ${user.email}.` : "Email isn't set up. Copy the invite link instead.",
    link,
    emailed,
  };
}

export async function updateUserProfile(id: string, input: { name: string; email: string }): Promise<UserResult & { fieldErrors?: Record<string, string> }> {
  const admin = await requireAdmin();
  const parsed = userSchema.pick({ name: true, email: true }).safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const clash = await prisma.user.findFirst({ where: { email: parsed.data.email, id: { not: id } } });
  if (clash) return { success: false, message: "That email is already in use.", fieldErrors: { email: "This email is already registered." } };
  const before = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  if (before && before.email !== user.email) {
    await notify(before.email, user.name, "Your sign-in email was changed", `An administrator changed your sign-in email to ${user.email}.`);
  }
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} updated ${user.name}'s details`,
  });
  revalidatePath("/admin/users");
  return { success: true, message: "Details saved." };
}

export async function updateUserRole(id: string, role: Role): Promise<UserResult> {
  const admin = await requireAdmin();
  if (!ROLES.includes(role)) return { success: false, message: "Invalid role." };
  if (admin.id === id) return { success: false, message: "You can't change your own role." };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === "CLIENT") return { success: false, message: "User not found." };
  if (target.role === "ADMIN" && role !== "ADMIN" && (await isLastActiveAdmin(id))) {
    return { success: false, message: "At least one active admin is required." };
  }
  await prisma.user.update({ where: { id }, data: { role } });
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} changed ${target.name} to ${roleLabel(role).toLowerCase()}`,
  });
  revalidatePath("/admin/users");
  return { success: true, message: "Role updated." };
}

export async function setUserDisabled(id: string, disabled: boolean): Promise<UserResult> {
  const admin = await requireAdmin();
  if (admin.id === id) return { success: false, message: "You can't deactivate your own account." };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { success: false, message: "User not found." };
  if (disabled && target.role === "ADMIN" && (await isLastActiveAdmin(id))) {
    return { success: false, message: "At least one active admin is required." };
  }
  await prisma.user.update({ where: { id }, data: { disabledAt: disabled ? new Date() : null } });
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} ${disabled ? "deactivated" : "reactivated"} ${target.name}`,
  });
  revalidatePath("/admin/users");
  await notify(
    target.email,
    target.name,
    disabled ? "Your access was removed" : "Your access was restored",
    disabled ? "An administrator deactivated your account, so you can no longer sign in." : "An administrator reactivated your account. You can sign in again."
  );
  return { success: true, message: disabled ? `${target.name} can no longer sign in.` : `${target.name} can sign in again.` };
}

/** Sets a new temporary password, signs the user out everywhere, and forces a change at next login. */
export async function resetUserPassword(id: string, password: string): Promise<UserResult> {
  const admin = await requireAdmin();
  if (password.length < 10) return { success: false, message: "Use at least 10 characters." };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { success: false, message: "User not found." };
  const bcrypt = await import("bcryptjs");
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10), passwordChangedAt: new Date(), mustChangePassword: true },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
  ]);
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} reset ${target.name}'s password`,
  });
  revalidatePath("/admin/users");
  await notify(target.email, target.name, "Your password was reset", "An administrator reset your password and signed you out everywhere. You'll choose a new password the next time you sign in.");
  return { success: true, message: "Password reset. Share the new password with them." };
}

export async function resetUserTwoFactor(id: string): Promise<UserResult> {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { success: false, message: "User not found." };
  if (!target.totpEnabled) return { success: false, message: "Two-factor authentication is already off." };
  await prisma.user.update({
    where: { id },
    data: { totpEnabled: false, totpSecret: null, totpLastStep: null, recoveryCodes: "[]" },
  });
  await logActivity({
    userId: admin.id,
    action: "updated",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} reset ${target.name}'s two-factor authentication`,
  });
  revalidatePath("/admin/users");
  return { success: true, message: "Two-factor authentication turned off. They can set it up again." };
}

export async function deleteUserAccount(id: string): Promise<UserResult> {
  const admin = await requireAdmin();
  if (admin.id === id) return { success: false, message: "You can't delete your own account." };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { success: false, message: "User not found." };
  if (target.role === "ADMIN" && (await isLastActiveAdmin(id))) {
    return { success: false, message: "At least one active admin is required." };
  }
  await prisma.user.delete({ where: { id } });
  await logActivity({
    userId: admin.id,
    action: "deleted",
    entityType: "User",
    entityId: id,
    message: `${admin.name ?? "An admin"} removed ${target.name}`,
  });
  revalidatePath("/admin/users");
  return { success: true, message: "User removed." };
}
