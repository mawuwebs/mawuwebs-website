import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { DocumentView } from "@/components/billing/document-view";
import { PrintButton } from "@/components/billing/print-button";
import { QuoteResponse } from "@/components/billing/quote-response";
import { isQuoteExpired } from "@/lib/billing";
import { quoteInclude, quoteToView } from "@/lib/billing-queries";

// The link is the credential: keep it out of search engines and referrer headers.
export const metadata: Metadata = { title: "Quote", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function PublicQuote({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 16) notFound();
  const [quote, settings] = await Promise.all([
    prisma.quote.findUnique({ where: { token }, include: quoteInclude }),
    getSiteSettings(),
  ]);
  if (!quote || quote.status === "DRAFT") notFound();
  const expired = isQuoteExpired(quote.validUntil);
  return (
    <main className="min-h-dvh bg-secondary/40 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden"><PrintButton pdfHref={`/q/${token}/pdf`} /></div>
      <DocumentView doc={quoteToView(quote)} issuer={settings} />
      <div className="mx-auto mt-6 max-w-3xl">
        {quote.status === "SENT" && !expired && <QuoteResponse token={token} defaultName={quote.user.name} />}
        {quote.status === "SENT" && expired && <p className="text-sm text-muted-foreground print:hidden">This quote has expired. Contact us for an updated one.</p>}
        {quote.status === "ACCEPTED" && <p className="text-sm text-muted-foreground print:hidden">Accepted by {quote.acceptedBy} on {quote.acceptedAt?.toLocaleDateString("en-GB")}.</p>}
        {quote.status === "DECLINED" && <p className="text-sm text-muted-foreground print:hidden">This quote was declined.</p>}
      </div>
    </main>
  );
}
