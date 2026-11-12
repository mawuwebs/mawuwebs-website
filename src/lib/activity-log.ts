import "server-only";
import { prisma } from "@/lib/prisma";

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  message,
}: {
  userId?: string | null;
  action: "created" | "updated" | "deleted" | "published" | "unpublished";
  entityType: string;
  entityId: string;
  message: string;
}) {
  await prisma.activityLog.create({
    data: { userId: userId ?? null, action, entityType, entityId, message },
  });
}
