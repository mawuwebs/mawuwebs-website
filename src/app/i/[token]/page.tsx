import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { DocumentView } from "@/components/billing/document-view";
import { PrintButton } from "@/components/billing/print-button";
import { invoiceInclude, invoiceToView } from "@/lib/billing-queries";
import { balanceDue, formatMoney, totals } from "@/lib/billing";
import { providersForCurrency } from "@/lib/payment-config";
import { PayButtons } from "@/components/billing/pay-buttons";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function PublicInvoice({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (token.length < 16) notFound();
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({ where: { token }, include: invoiceInclude }),
    getSiteSettings(),
  ]);
  if (!invoice || invoice.status === "DRAFT") notFound();
  const balance = balanceDue(totals(invoice.items, invoice.taxBp).total, invoice.payments);
  const providers = invoice.status === "SENT" && balance > 0 ? await providersForCurrency(invoice.currency) : [];
  return (
    <main className="min-h-dvh bg-secondary/40 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden"><PrintButton pdfHref={`/i/${token}/pdf`} /></div>
      <DocumentView doc={invoiceToView(invoice)} issuer={settings} />
      <div className="mx-auto mt-6 max-w-3xl space-y-3">
        {sp.paid && invoice.status !== "PAID" && <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm print:hidden">Thank you. We are confirming your payment. Refresh this page in a minute.</p>}
        {providers.length > 0 && <PayButtons token={token} providers={providers} amountLabel={formatMoney(balance, invoice.currency)} />}
      </div>
    </main>
  );
}
