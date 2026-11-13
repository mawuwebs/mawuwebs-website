import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { getSiteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/mail";
import { PAYMENT_METHOD_LABEL, amountPaid, balanceDue, bpToPercent, formatMoney, minorToInput, totals } from "@/lib/billing";
import { fmtDate } from "@/lib/portal";
import { editorOptions, invoiceInclude, invoiceToView } from "@/lib/billing-queries";
import { DocumentEditor } from "@/components/admin/document-editor";
import { DocumentView } from "@/components/billing/document-view";
import { AddBillableExpensesButton } from "@/components/admin/expense-forms";
import { InvoiceActions, PaymentForm, RefundForm, RemovePaymentButton } from "@/components/admin/billing-actions";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("billing");
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { ...invoiceInclude, quote: { select: { id: true, number: true } } } });
  if (!invoice) notFound();
  const settings = await getSiteSettings();
  const isDraft = invoice.status === "DRAFT";
  const { clients, projects } = isDraft ? await editorOptions() : { clients: [], projects: [] };
  const billable = isDraft && invoice.projectId
    ? await prisma.expense.aggregate({ where: { projectId: invoice.projectId, billable: true, invoiceId: null, deletedAt: null, currency: invoice.currency }, _count: { _all: true }, _sum: { amount: true } })
    : null;
  const balance = balanceDue(totals(invoice.items, invoice.taxBp).total, invoice.payments);
  // Older gateway refund rows were logged against the invoice number, so match both.
  const history = await prisma.activityLog.findMany({
    where: { entityType: "Invoice", entityId: { in: [invoice.id, invoice.number] } },
    orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } },
  });
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Invoice {invoice.number}</h1>
        <p className="text-sm text-muted-foreground">
          {invoice.user.company || invoice.user.name} · <Link href={`/admin/clients/${invoice.userId}`} className="underline underline-offset-2">client page</Link>
          {invoice.quote && <> · from <Link href={`/admin/billing/quotes/${invoice.quote.id}`} className="underline underline-offset-2">{invoice.quote.number}</Link></>}
        </p>
      </div>
      <InvoiceActions id={invoice.id} status={invoice.status} hasPayments={invoice.payments.length > 0} />
      {!isDraft && (
        <p className="break-all text-sm text-muted-foreground">Client link: <a className="underline underline-offset-2" href={`/i/${invoice.token}`} target="_blank" rel="noopener noreferrer">{siteUrl()}/i/{invoice.token}</a> · <a className="underline underline-offset-2" href={`/i/${invoice.token}/pdf`} target="_blank" rel="noopener noreferrer">PDF</a></p>
      )}

      {isDraft && balance > 0 && (
        <p className="text-sm text-muted-foreground">
          Client already paid? <a href="#record-payment" className="underline underline-offset-2">Record the payment</a> below. The invoice is then issued automatically (no email is sent).
        </p>
      )}
      {isDraft ? (
        <>
          {billable && billable._count._all > 0 && <AddBillableExpensesButton invoiceId={invoice.id} count={billable._count._all} label={formatMoney(billable._sum.amount ?? 0, invoice.currency)} />}
          <DocumentEditor
            key={invoice.items.length}
            kind="invoice" id={invoice.id} clients={clients} projects={projects}
            initial={{
              clientId: invoice.userId, projectId: invoice.projectId ?? "", title: invoice.title, currency: invoice.currency, taxPercent: bpToPercent(invoice.taxBp), notes: invoice.notes,
              date: invoice.dueDate?.toISOString().slice(0, 10) ?? "", depositPercent: "",
              items: invoice.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit: minorToInput(i.unitAmount) })),
            }}
          />
          {balance > 0 && (
            <section id="record-payment" className="scroll-mt-20 rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-1 font-semibold">Record a payment</h2>
              <p className="mb-3 text-sm text-muted-foreground">Save any edits above first. Recording a payment issues this invoice, after which it can no longer be edited.</p>
              <PaymentForm key={balance} invoiceId={invoice.id} currency={invoice.currency} balance={balance} />
            </section>
          )}
        </>
      ) : (
        <>
          <DocumentView doc={invoiceToView(invoice)} issuer={settings} />
          {invoice.status === "SENT" && balance > 0 && (
            <section id="record-payment" className="scroll-mt-20 rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 font-semibold">Record a payment</h2>
              <PaymentForm key={balance} invoiceId={invoice.id} currency={invoice.currency} balance={balance} />
            </section>
          )}
          {amountPaid(invoice.payments) > 0 && (
            <details className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer text-sm font-medium">Record a refund</summary>
              <div className="mt-4"><RefundForm key={invoice.payments.length} invoiceId={invoice.id} currency={invoice.currency} maxRefund={amountPaid(invoice.payments)} /></div>
            </details>
          )}
          {invoice.payments.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 font-semibold">Payments</h2>
              <ul className="divide-y divide-border text-sm">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span>{fmtDate(p.paidAt)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                    <span className="flex items-center gap-3"><span className="tabular-nums">{formatMoney(p.amount, invoice.currency)}</span>{!p.externalId && <RemovePaymentButton id={p.id} />}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {history.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5" aria-label="History">
          <h2 className="mb-3 font-semibold">History</h2>
          <ol className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                <span>{h.message}</span>
                <time dateTime={h.createdAt.toISOString()} className="text-xs text-muted-foreground">{h.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
