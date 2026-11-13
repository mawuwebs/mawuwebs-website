import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { receiptPath } from "@/lib/receipts";
import { cleanFileName } from "@/lib/expenses";

export const dynamic = "force-dynamic";

/** Serves a private expense receipt to signed-in staff with billing access. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(session.user.role, "billing")) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const e = await prisma.expense.findUnique({ where: { id }, select: { receiptFile: true, receiptName: true, receiptMime: true } });
  const file = e?.receiptFile ? receiptPath(e.receiptFile) : null;
  if (!e || !file) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(file);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": e.receiptMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${cleanFileName(e.receiptName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
