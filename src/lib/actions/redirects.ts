"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { normalizePath } from "@/lib/redirects";

export type RedirectFormState = { success: boolean; message: string };

const schema = z.object({
  fromPath: z.string().trim().min(1, "Old URL is required."),
  toPath: z.string().trim().min(1, "New URL is required."),
  permanent: z.boolean(),
});

export async function createRedirect(
  _prev: RedirectFormState,
  formData: FormData
): Promise<RedirectFormState> {
  const user = await requireArea("content");
  const parsed = schema.safeParse({
    fromPath: formData.get("fromPath"),
    toPath: formData.get("toPath"),
    permanent: formData.get("permanent") !== "off",
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const from = normalizePath(parsed.data.fromPath);
  const to = /^https?:\/\//i.test(parsed.data.toPath)
    ? parsed.data.toPath.trim()
    : normalizePath(parsed.data.toPath);

  if (from === "/" || from.startsWith("/admin") || from.startsWith("/api"))
    return { success: false, message: "That path cannot be redirected." };
  if (from === to) return { success: false, message: "Old and new URL are the same." };

  await prisma.redirect.upsert({
    where: { fromPath: from },
    create: { fromPath: from, toPath: to, permanent: parsed.data.permanent },
    update: { toPath: to, permanent: parsed.data.permanent, auto: false },
  });
  await logActivity({
    userId: user.id,
    action: "created",
    entityType: "Redirect",
    entityId: from,
    message: `Redirect ${from} → ${to}`,
  });
  revalidatePath("/admin/redirects");
  return { success: true, message: "Redirect saved. Live within a minute." };
}

export async function deleteRedirect(id: string) {
  const user = await requireArea("content");
  const r = await prisma.redirect.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Redirect",
    entityId: id,
    message: `Removed redirect ${r.fromPath}`,
  });
  revalidatePath("/admin/redirects");
  return { success: true, message: "Redirect removed." };
}
