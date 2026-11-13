import "server-only";
import path from "node:path";

/**
 * Receipts are private financial records, so they live outside /public and are only served through the
 * authenticated route at /admin/billing/expenses/[id]/receipt. Set RECEIPT_DIR to a persistent volume in production.
 */
export const RECEIPT_DIR = process.env.RECEIPT_DIR || path.join(process.cwd(), "data", "receipts");

/** Resolve a stored file name, refusing anything that is not a plain file name. */
export function receiptPath(file: string) {
  if (!/^[\w-]+\.(jpg|png|webp|pdf)$/.test(file)) return null;
  return path.join(RECEIPT_DIR, file);
}
