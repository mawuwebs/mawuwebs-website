import path from "node:path";

/** Where uploaded files live on disk. Set UPLOAD_DIR to a persistent, backed-up folder in production. */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR?.trim()
  ? path.resolve(process.env.UPLOAD_DIR.trim())
  : path.join(process.cwd(), "public", "uploads");

export const UPLOAD_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
