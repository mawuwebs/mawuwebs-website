import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portal";
import { getSiteSettings } from "@/lib/settings";
import { DocumentView } from "@/components/billing/document-view";
import { PrintButton } from "@/components/billing/print-button";
import { QuoteResponse } from "@/components/billing/quote-response";
import { isQuoteExpired } from "@/lib/billing";
import { quoteInclude, quoteToView } from "@/lib/billing-queries";

export const metadata: Metadata = { title: "Quote" };

export default async function PortalQuote({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePortalUser()]);
  // Scoped to the signed-in client, and drafts are never visible.
  const [quote, settings] = await Promise.all([
    prisma.quote.findFirst({ where: { id, userId: user.id, status: { not: "DRAFT" } }, include: quoteInclude }),
    getSiteSettings(),
  ]);
  if (!quote) notFound();
  const expired = isQuoteExpired(quote.validUntil);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/billing" className="text-sm text-muted-foreground hover:text-foreground">← Quotes and invoices</Link>
        <PrintButton />
      </div>
      <DocumentView doc={quoteToView(quote)} issuer={settings} />
      <div className="mx-auto max-w-3xl">
        {quote.status === "SENT" && !expired && <QuoteResponse quoteId={quote.id} />}
        {quote.status === "SENT" && expired && <p className="text-sm text-muted-foreground print:hidden">This quote has expired. Contact us for an updated one.</p>}
      </div>
    </div>
  );
}
