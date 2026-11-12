import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEnquiryWhere } from "@/lib/submission-query";
import { KIND_LABEL, kindOf, statusLabel } from "@/lib/submission";

export const dynamic = "force-dynamic";

/** Quote cells so commas/newlines survive, and neutralise spreadsheet formula injection. */
function cell(value: string | number | null | undefined) {
  let v = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const p = request.nextUrl.searchParams;
  const rows = await prisma.contactSubmission.findMany({
    where: buildEnquiryWhere({
      status: p.get("status") ?? undefined,
      type: p.get("type") ?? undefined,
      q: p.get("q") ?? undefined,
      follow: p.get("follow") ?? undefined,
    }),
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });

  const head = ["Date", "Name", "Email", "Phone", "Type", "Subject", "Status", "Quote (USD)", "Follow-up", "Message", "Notes"];
  const lines = [head.map(cell).join(",")];
  for (const s of rows) {
    lines.push(
      [
        s.createdAt.toISOString().slice(0, 10),
        s.name,
        s.email,
        s.phone,
        KIND_LABEL[kindOf(s)],
        s.subject,
        statusLabel(s.status),
        s.quoteAmount,
        s.followUpAt?.toISOString().slice(0, 10),
        s.message,
        s.notes,
      ]
        .map(cell)
        .join(",")
    );
  }

  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
