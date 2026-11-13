import { getBillingSettings } from "@/lib/billing-settings";
import { PAYMENT_METHOD_LABEL, amountPaid, balanceDue, depositSplit, formatMoney, lineTotal, subtotal, totals, type LineItem } from "@/lib/billing";

export type DocViewData = {
  kind: "quote" | "invoice";
  number: string;
  title: string;
  currency: string;
  taxBp: number;
  notes: string;
  items: LineItem[];
  issuedAt: Date;
  /** Quote: valid until. Invoice: due date. */
  date: Date | null;
  statusLabel: string;
  overdue?: boolean;
  /** Quotes: percent invoiced up front once accepted (0 = none). */
  depositPct?: number;
  client: { name: string; company: string; email: string; phone?: string; address?: string; city?: string; country?: string; taxId?: string };
  payments?: { id: string; amount: number; method: string; reference: string; paidAt: Date }[];
};

export type Issuer = { siteName: string; address: string; contactEmail: string; phone: string };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * The printable sheet. Always dark-on-white so "Print / Save as PDF" looks right in any theme.
 * Server component: pass it plain data.
 */
export async function DocumentView({ doc, issuer }: { doc: DocViewData; issuer: Issuer }) {
  const bs = await getBillingSettings();
  const t = totals(doc.items, doc.taxBp);
  const paid = doc.payments ? amountPaid(doc.payments) : 0;
  const balance = doc.payments ? balanceDue(t.total, doc.payments) : t.total;
  const money = (n: number) => formatMoney(n, doc.currency);
  const isInvoice = doc.kind === "invoice";
  const isPaid = isInvoice && balance <= 0 && t.total > 0;
  const label = isInvoice ? "Invoice" : "Quote";
  const legal = bs.legalName || issuer.siteName;
  return (
    <article className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <header className="flex flex-wrap items-start justify-between gap-6 bg-[#0b1340] px-6 py-7 text-white sm:px-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/portrait-mark.webp" alt="" width={52} height={52} className="size-[52px] shrink-0 object-contain" />
          <div>
            <p className="font-display text-xl font-bold leading-tight">{issuer.siteName}</p>
            <p className="text-xs text-white/70">{issuer.contactEmail}{issuer.phone ? ` · ${issuer.phone}` : ""}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5a623]">{label}</p>
          <p className="font-display text-3xl font-bold leading-tight">{doc.number}</p>
        </div>
      </header>
      <div className="h-1 bg-[#f5a623]" />

      {isPaid && (
        <div aria-hidden="true" className="pointer-events-none absolute right-8 top-44 -rotate-12 rounded-lg border-4 border-emerald-600/70 px-5 py-1 font-display text-4xl font-extrabold uppercase tracking-widest text-emerald-600/70 sm:right-14">Paid</div>
      )}

      <div className="p-6 sm:p-10">
        <section className="grid gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">From</p>
            <p className="mt-1 font-medium">{legal}</p>
            <p className="whitespace-pre-line text-neutral-600">{issuer.address}</p>
            {bs.taxId && <p className="mt-1 text-neutral-600">Tax ID: {bs.taxId}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{isInvoice ? "Billed to" : "Prepared for"}</p>
            <p className="mt-1 font-medium">{doc.client.company || doc.client.name}</p>
            {doc.client.company && <p className="text-neutral-600">{doc.client.name}</p>}
            {(doc.client.address || doc.client.city || doc.client.country) && (
              <p className="whitespace-pre-line text-neutral-600">{[doc.client.address, [doc.client.city, doc.client.country].filter(Boolean).join(", ")].filter(Boolean).join("\n")}</p>
            )}
            <p className="text-neutral-600">{doc.client.email}{doc.client.phone ? ` · ${doc.client.phone}` : ""}</p>
            {doc.client.taxId && <p className="text-neutral-600">Tax ID: {doc.client.taxId}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 sm:text-right">
            <dt className="text-neutral-500">Issued</dt><dd>{fmt(doc.issuedAt)}</dd>
            {doc.date && (<><dt className="text-neutral-500">{isInvoice ? "Due" : "Valid until"}</dt><dd className={doc.overdue ? "font-semibold text-red-700" : ""}>{fmt(doc.date)}</dd></>)}
            <dt className="text-neutral-500">Status</dt>
            <dd className={doc.overdue ? "font-semibold text-red-700" : isPaid ? "font-semibold text-emerald-700" : ""}>{doc.overdue ? "Overdue" : doc.statusLabel}</dd>
          </dl>
        </section>

        <h1 className="mt-10 font-display text-lg font-semibold">{doc.title}</h1>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-600">
                <th className="rounded-l-md px-3 py-2 font-semibold">Description</th><th className="px-3 py-2 text-right font-semibold">Qty</th><th className="px-3 py-2 text-right font-semibold">Unit price</th><th className="rounded-r-md px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {doc.items.map((i, idx) => (
                <tr key={idx} className="break-inside-avoid">
                  <td className="px-3 py-3 pr-4">{i.description}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{i.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(i.unitAmount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(lineTotal(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 text-sm">
            {isInvoice && bs.paymentInstructions && (
              <section className="break-inside-avoid rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">How to pay</h2>
                <p className="mt-1.5 whitespace-pre-line text-neutral-800">{bs.paymentInstructions}</p>
                <p className="mt-2 text-xs text-neutral-500">Please quote <strong>{doc.number}</strong> as the payment reference.</p>
              </section>
            )}
            {!isInvoice && (doc.depositPct ?? 0) > 0 && (
              <p className="break-inside-avoid rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-800">
                <strong>Deposit:</strong> {doc.depositPct}% ({money(totals([{ description: "", quantity: 1, unitAmount: depositSplit(subtotal(doc.items), doc.depositPct ?? 0).deposit }], doc.taxBp).total)}) is invoiced when you accept. The remainder is invoiced afterwards.
              </p>
            )}
          </div>
          <dl className="grid w-full shrink-0 grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm tabular-nums sm:max-w-xs">
            <dt className="text-neutral-500">Subtotal</dt><dd className="text-right">{money(t.subtotal)}</dd>
            {doc.taxBp > 0 && (<><dt className="text-neutral-500">Tax ({doc.taxBp / 100}%)</dt><dd className="text-right">{money(t.tax)}</dd></>)}
            <dt className="border-t border-neutral-300 pt-2 font-semibold">Total</dt><dd className="border-t border-neutral-300 pt-2 text-right font-semibold">{money(t.total)}</dd>
            {isInvoice && paid > 0 && (<><dt className="text-neutral-500">Paid</dt><dd className="text-right text-emerald-700">−{money(paid)}</dd></>)}
            {isInvoice && (
              <div className="col-span-2 mt-2 flex items-center justify-between rounded-xl bg-[#0b1340] px-4 py-3 text-white">
                <span className="text-sm font-semibold">{isPaid ? "Balance" : "Balance due"}</span>
                <span className="font-display text-xl font-bold text-[#f5a623]">{money(balance)}</span>
              </div>
            )}
          </dl>
        </div>

        {doc.payments && doc.payments.length > 0 && (
          <section className="mt-8 break-inside-avoid text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Payments received</h2>
            <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
              {doc.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{fmt(p.paidAt)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {doc.notes && (
          <section className="mt-8 break-inside-avoid text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{isInvoice ? "Notes" : "Notes and terms"}</h2>
            <p className="mt-1 whitespace-pre-line text-neutral-700">{doc.notes}</p>
          </section>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          Thank you for your business · {issuer.siteName}{issuer.contactEmail ? ` · ${issuer.contactEmail}` : ""}
        </footer>
      </div>
    </article>
  );
}
