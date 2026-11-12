"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  siteName: z.string().trim().min(1, "Site name is required."),
  tagline: z.string().trim().min(1, "Tagline is required."),
  logo: z.string().trim().optional(),
  favicon: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(1, "Phone is required."),
  address: z.string().trim().min(1, "Address is required."),
  mapEmbedUrl: z.string().trim().optional(),
  footerText: z.string().trim().min(1),
  heroHeadline: z.string().trim().min(1),
  heroSubheading: z.string().trim().min(1),
  heroCtaPrimaryText: z.string().trim().min(1),
  heroCtaPrimaryUrl: z.string().trim().min(1),
  heroCtaSecondaryText: z.string().trim().min(1),
  heroCtaSecondaryUrl: z.string().trim().min(1),
  newsletterEnabled: z.coerce.boolean(),
  bookingUrl: z.string().trim().optional(),
});

export type SettingsFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function updateSiteSettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    siteName: formData.get("siteName"),
    tagline: formData.get("tagline"),
    logo: formData.get("logo"),
    favicon: formData.get("favicon"),
    contactEmail: formData.get("contactEmail"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    mapEmbedUrl: formData.get("mapEmbedUrl"),
    footerText: formData.get("footerText"),
    heroHeadline: formData.get("heroHeadline"),
    heroSubheading: formData.get("heroSubheading"),
    heroCtaPrimaryText: formData.get("heroCtaPrimaryText"),
    heroCtaPrimaryUrl: formData.get("heroCtaPrimaryUrl"),
    heroCtaSecondaryText: formData.get("heroCtaSecondaryText"),
    heroCtaSecondaryUrl: formData.get("heroCtaSecondaryUrl"),
    newsletterEnabled: formData.get("newsletterEnabled"),
    bookingUrl: formData.get("bookingUrl"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false, message: "Please fix the errors below.", fieldErrors };
  }

  const labels = formData.getAll("metricLabel").map(String);
  const values = formData.getAll("metricValue").map(String);
  const metrics = labels
    .map((label, i) => ({ label: label.trim(), value: values[i]?.trim() ?? "" }))
    .filter((m) => m.label && m.value);

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { ...parsed.data, bookingUrl: parsed.data.bookingUrl || null, metrics: JSON.stringify(metrics) },
    create: { id: "main", ...parsed.data, bookingUrl: parsed.data.bookingUrl || null, metrics: JSON.stringify(metrics) },
  });

  await logActivity({
    userId: user.id,
    action: "updated",
    entityType: "SiteSettings",
    entityId: "main",
    message: "Updated site settings",
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true, message: "Settings saved." };
}

const socialLinkSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required."),
  url: z.string().trim().url("Enter a valid URL."),
  order: z.coerce.number().int().default(0),
});

export type SocialLinkState = { success: boolean; message: string };

export async function createSocialLink(
  _prev: SocialLinkState,
  formData: FormData
): Promise<SocialLinkState> {
  await requireUser();
  const parsed = socialLinkSchema.safeParse({
    platform: formData.get("platform"),
    url: formData.get("url"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  await prisma.socialLink.create({ data: parsed.data });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true, message: "Social link added." };
}

export async function deleteSocialLink(id: string): Promise<SocialLinkState> {
  await requireUser();
  await prisma.socialLink.delete({ where: { id } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true, message: "Social link removed." };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(["ADMIN", "EDITOR"]),
});

export type UserFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function createUserAccount(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();
  const bcrypt = await import("bcryptjs");

  const password = formData.get("password")?.toString() ?? "";
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false, message: "Please fix the errors below.", fieldErrors };
  }
  if (password.length < 8) {
    return {
      success: false,
      message: "Please fix the errors below.",
      fieldErrors: { password: "Password must be at least 8 characters." },
    };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      success: false,
      message: "That email is already in use.",
      fieldErrors: { email: "This email is already registered." },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { ...parsed.data, passwordHash } });

  revalidatePath("/admin/users");
  return { success: true, message: "User created." };
}

export async function deleteUserAccount(id: string) {
  const currentUser = await requireAdmin();
  if (currentUser.id === id) {
    return { success: false, message: "You can't delete your own account." };
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { success: true, message: "User removed." };
}
