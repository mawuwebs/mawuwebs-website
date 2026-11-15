import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { UPLOAD_ROOT, UPLOAD_TYPES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Serves files uploaded after the build (the static public/ folder is only read at build time),
 * and files in a custom UPLOAD_DIR. Images only; path traversal is rejected.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segs } = await ctx.params;
  const rel = path.join(...segs);
  const full = path.resolve(UPLOAD_ROOT, rel);
  const type = UPLOAD_TYPES[path.extname(full).slice(1).toLowerCase()];
  if (!type || (full !== UPLOAD_ROOT && !full.startsWith(UPLOAD_ROOT + path.sep))) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await readFile(full);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        // File names are random UUIDs and never change, so they cache safely.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
