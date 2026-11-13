import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { getSiteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/mail";
import { bpToPercent, minorToInput } from "@/lib/billing";
import { editorOptions, quoteInclude, quoteToView } from "@/lib/billing-queries";
import { DocumentEditor } from "@/components/admin/document-editor";
import { DocumentView } from "@/components/billing/document-view";
import { QuoteActions } from "@/components/admin/billing-actions";

export const metadata: Metadata = { title: "Quote" };
export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("billing");
  const { id } = await params;
  const quote = await prisma.quote.findUnique({ where: { id }, include: { ...quoteInclude, invoices: { select: { id: true, number: true } } } });
  if (!quote) notFound();
  const settings = await getSiteSettings();
  const isDraft = quote.status === "DRAFT";
  const { clients, projects } = isDraft ? await editorOptions() : { clients: [], projects: [] };
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Quote {quote.number}</h1>
        <p className="text-sm text-muted-foreground">{quote.user.company || quote.user.name} · <Link href={`/admin/clients/${quote.userId}`} className="underline underline-offset-2">client page</Link></p>
      </div>
      <QuoteActions id={quote.id} status={quote.status} hasInvoice={quote.invoices.length > 0} />
      {quote.invoices.map((i) => (
        <p key={i.id} className="text-sm">Invoice: <Link className="underline underline-offset-2" href={`/admin/billing/invoices/${i.id}`}>{i.number}</Link></p>
      ))}
      {quote.status !== "DRAFT" && (
        <p className="break-all text-sm text-muted-foreground">Client link: <a className="underline underline-offset-2" href={`/q/${quote.token}`} target="_blank" rel="noopener noreferrer">{siteUrl()}/q/{quote.token}</a></p>
      )}
      {isDraft ? (
        <DocumentEditor
          kind="quote" id={quote.id} clients={clients} projects={projects}
          initial={{
            clientId: quote.userId, projectId: quote.projectId ?? "", title: quote.title, currency: quote.currency, taxPercent: bpToPercent(quote.taxBp), notes: quote.notes,
            date: quote.validUntil?.toISOString().slice(0, 10) ?? "",
            items: quote.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit: minorToInput(i.unitAmount) })),
          }}
        />
      ) : (
        <DocumentView doc={quoteToView(quote)} issuer={settings} />
      )}
    </div>
  );
}
