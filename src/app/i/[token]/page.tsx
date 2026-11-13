import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { DocumentView } from "@/components/billing/document-view";
import { PrintButton } from "@/components/billing/print-button";
import { invoiceInclude, invoiceToView } from "@/lib/billing-queries";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function PublicInvoice({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 16) notFound();
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({ where: { token }, include: invoiceInclude }),
    getSiteSettings(),
  ]);
  if (!invoice || invoice.status === "DRAFT") notFound();
  return (
    <main className="min-h-dvh bg-secondary/40 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden"><PrintButton /></div>
      <DocumentView doc={invoiceToView(invoice)} issuer={settings} />
    </main>
  );
}
