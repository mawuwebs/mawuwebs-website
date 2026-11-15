"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { getMediaUsage } from "@/lib/media-usage";
import { sniffImage } from "@/lib/image-sniff";
import { UPLOAD_ROOT } from "@/lib/uploads";
import { logActivity } from "@/lib/activity-log";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const UPLOAD_DIR = UPLOAD_ROOT;

export type UploadState = {
  success: boolean;
  message: string;
  url?: string;
  mediaId?: string;
};

export async function uploadMedia(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  await requireArea("content");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please choose a file to upload." };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return {
      success: false,
      message: "Unsupported file type. Please upload a JPG, PNG, WEBP, or GIF image.",
    };
  }
  if (file.size > MAX_SIZE) {
    return { success: false, message: "File is too large. Maximum size is 5MB." };
  }

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (sniffImage(buffer) !== file.type) {
    return { success: false, message: "That file isn't a valid image." };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const url = `/uploads/${filename}`;
  const media = await prisma.media.create({
    data: {
      filename,
      url,
      mimeType: file.type,
      size: file.size,
      alt: (formData.get("alt") as string) || "",
    },
  });

  revalidatePath("/admin/media");

  return { success: true, message: "Upload complete.", url, mediaId: media.id };
}

export async function deleteMedia(id: string, force = false) {
  const user = await requireArea("content");
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return { success: false, message: "File not found." };

  if (!force) {
    const used = (await getMediaUsage([media.url]))[media.url];
    if (used.length > 0) {
      return {
        success: false,
        message: `Still used in ${used.length} place${used.length === 1 ? "" : "s"}: ${used.slice(0, 3).join(", ")}${used.length > 3 ? "…" : ""}`,
      };
    }
  }

  try {
    await unlink(path.join(UPLOAD_DIR, media.filename));
  } catch {
    // File already missing from disk — still remove the DB record.
  }

  await prisma.media.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "deleted",
    entityType: "Media",
    entityId: id,
    message: `Deleted image ${media.filename}${force ? " (was in use)" : ""}`,
  });
  revalidatePath("/admin/media");
  return { success: true, message: "File deleted." };
}
