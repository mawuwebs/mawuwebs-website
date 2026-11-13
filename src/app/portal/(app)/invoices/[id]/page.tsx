import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/portal";
import { getSiteSettings } from "@/lib/settings";
import { DocumentView } from "@/components/billing/document-view";
import { PrintButton } from "@/components/billing/print-button";
import { invoiceInclude, invoiceToView } from "@/lib/billing-queries";
import { balanceDue, formatMoney, totals } from "@/lib/billing";
import { providersForCurrency } from "@/lib/payment-config";
import { PayButtons } from "@/components/billing/pay-buttons";

export const metadata: Metadata = { title: "Invoice" };

export default async function PortalInvoice({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePortalUser()]);
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findFirst({ where: { id, userId: user.id, status: { not: "DRAFT" } }, include: invoiceInclude }),
    getSiteSettings(),
  ]);
  if (!invoice) notFound();
  const balance = balanceDue(totals(invoice.items, invoice.taxBp).total, invoice.payments);
  const providers = invoice.status === "SENT" && balance > 0 ? await providersForCurrency(invoice.currency) : [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/billing" className="text-sm text-muted-foreground hover:text-foreground">← Quotes and invoices</Link>
        <PrintButton pdfHref={`/i/${invoice.token}/pdf`} />
      </div>
      <DocumentView doc={invoiceToView(invoice)} issuer={settings} />
      {providers.length > 0 && <div className="mx-auto max-w-3xl"><PayButtons token={invoice.token} providers={providers} amountLabel={formatMoney(balance, invoice.currency)} /></div>}
    </div>
  );
}
