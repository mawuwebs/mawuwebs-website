import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { getBillingSettings } from "@/lib/billing-settings";
import { quoteInclude, quoteToView } from "@/lib/billing-queries";
import { renderDocPdf } from "@/lib/doc-pdf";

export const dynamic = "force-dynamic";

/** PDF of a quote, reachable only with its unguessable token (same access as the public page). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 16) return new NextResponse("Not found", { status: 404 });
  const [inv, settings, bs] = await Promise.all([
    prisma.quote.findUnique({ where: { token }, include: quoteInclude }),
    getSiteSettings(),
    getBillingSettings(),
  ]);
  if (!inv || inv.status === "DRAFT") return new NextResponse("Not found", { status: 404 });
  const bytes = await renderDocPdf(quoteToView(inv), settings, bs);
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${inv.number}.pdf"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
  });
}
