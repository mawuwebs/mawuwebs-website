"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { ENTITIES, delegate, isEntityType, saveRevision, snapshotToUpdate, type EntityType } from "@/lib/revisions";

type Result = { success: boolean; message: string };

function refresh(type: EntityType, slug?: string) {
  const cfg = ENTITIES[type];
  revalidatePath(cfg.adminPath);
  revalidatePath("/sitemap.xml");
  for (const p of cfg.publicPaths) revalidatePath(p);
  if (slug && cfg.publicPaths[0] && type !== "plan") revalidatePath(`${cfg.publicPaths[0]}/${slug}`);
}

async function load(type: string, id: string) {
  if (!isEntityType(type)) throw new Error("Unknown content type.");
  const row = await delegate(type).findUnique({ where: { id } });
  if (!row) throw new Error("Item not found.");
  return { type, row, title: String(row.title ?? row.name ?? ""), slug: String(row.slug ?? "") };
}

async function guard(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn();
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Moves an item to the trash: hidden from the site, restorable. */
export async function trashItem(type: string, id: string): Promise<Result> {
  return guard(async () => {
    const user = await requireUser();
    const { type: t, title, slug } = await load(type, id);
    await delegate(t).update({ where: { id }, data: { deletedAt: new Date() } });
    await logActivity({ userId: user.id, action: "deleted", entityType: t, entityId: id, message: `Moved ${ENTITIES[t].label} "${title}" to the trash` });
    refresh(t, slug);
    return { success: true, message: `Moved to trash.` };
  });
}

export async function restoreItem(type: string, id: string): Promise<Result> {
  return guard(async () => {
    const user = await requireUser();
    const { type: t, title, slug } = await load(type, id);
    await delegate(t).update({ where: { id }, data: { deletedAt: null } });
    await logActivity({ userId: user.id, action: "restored", entityType: t, entityId: id, message: `Restored ${ENTITIES[t].label} "${title}"` });
    refresh(t, slug);
    return { success: true, message: "Restored." };
  });
}

/** Permanent delete: only from the trash, only admins. */
export async function purgeItem(type: string, id: string): Promise<Result> {
  return guard(async () => {
    const user = await requireAdmin();
    const { type: t, row, title } = await load(type, id);
    if (!row.deletedAt) return { success: false, message: "Only trashed items can be deleted permanently." };
    await delegate(t).delete({ where: { id } });
    await prisma.revision.deleteMany({ where: { entityType: t, entityId: id } });
    await logActivity({ userId: user.id, action: "deleted", entityType: t, entityId: id, message: `Permanently deleted ${ENTITIES[t].label} "${title}"` });
    refresh(t);
    return { success: true, message: "Deleted permanently." };
  });
}

/** Restores an older version. The current version is saved first, so this is itself undoable. */
export async function restoreRevision(revisionId: string): Promise<Result> {
  return guard(async () => {
    const user = await requireUser();
    const rev = await prisma.revision.findUnique({ where: { id: revisionId } });
    if (!rev || !isEntityType(rev.entityType)) return { success: false, message: "Version not found." };
    const t = rev.entityType;
    const current = await delegate(t).findUnique({ where: { id: rev.entityId } });
    if (!current) return { success: false, message: "The item no longer exists." };
    await saveRevision(t, rev.entityId, user.name ?? "Admin", "Before restoring an older version");
    const data = await snapshotToUpdate(t, rev.entityId, rev.snapshot);
    const updated = await delegate(t).update({ where: { id: rev.entityId }, data });
    await logActivity({
      userId: user.id,
      action: "restored",
      entityType: t,
      entityId: rev.entityId,
      message: `Restored an earlier version of ${ENTITIES[t].label} "${String(updated.title ?? updated.name ?? "")}"`,
    });
    refresh(t, String(updated.slug ?? ""));
    revalidatePath(`${ENTITIES[t].adminPath}/${rev.entityId}`);
    return { success: true, message: "Earlier version restored." };
  });
}
