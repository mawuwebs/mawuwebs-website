"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-admin";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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
  await requireUser();

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

export async function deleteMedia(id: string) {
  await requireUser();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return { success: false, message: "File not found." };

  try {
    await unlink(path.join(UPLOAD_DIR, media.filename));
  } catch {
    // File already missing from disk — still remove the DB record.
  }

  await prisma.media.delete({ where: { id } });
  revalidatePath("/admin/media");
  return { success: true, message: "File deleted." };
}
