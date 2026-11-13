import { PAYMENT_METHOD_LABEL, amountPaid, balanceDue, formatMoney, lineTotal, totals, type LineItem } from "@/lib/billing";

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
  client: { name: string; company: string; email: string };
  payments?: { id: string; amount: number; method: string; reference: string; paidAt: Date }[];
};

export type Issuer = { siteName: string; address: string; contactEmail: string; phone: string };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * The printable sheet. Always dark-on-white so "Print / Save as PDF" looks right in any theme.
 * Server component: pass it plain data.
 */
export function DocumentView({ doc, issuer }: { doc: DocViewData; issuer: Issuer }) {
  const t = totals(doc.items, doc.taxBp);
  const paid = doc.payments ? amountPaid(doc.payments) : 0;
  const balance = doc.payments ? balanceDue(t.total, doc.payments) : t.total;
  const money = (n: number) => formatMoney(n, doc.currency);
  return (
    <article className="mx-auto w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-display text-xl font-bold">{issuer.siteName}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{issuer.address}</p>
          <p className="text-sm text-neutral-600">{issuer.contactEmail}{issuer.phone ? ` · ${issuer.phone}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{doc.kind === "quote" ? "Quote" : "Invoice"}</p>
          <p className="font-display text-2xl font-bold">{doc.number}</p>
          <p className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${doc.overdue ? "border-red-300 text-red-700" : "border-neutral-300 text-neutral-700"}`}>
            {doc.overdue ? "Overdue" : doc.statusLabel}
          </p>
        </div>
      </header>

      <section className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{doc.kind === "quote" ? "Prepared for" : "Billed to"}</p>
          <p className="mt-1 font-medium">{doc.client.company || doc.client.name}</p>
          {doc.client.company && <p className="text-neutral-600">{doc.client.name}</p>}
          <p className="text-neutral-600">{doc.client.email}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:text-right">
          <dt className="text-neutral-500">Issued</dt><dd>{fmt(doc.issuedAt)}</dd>
          {doc.date && (<><dt className="text-neutral-500">{doc.kind === "quote" ? "Valid until" : "Due"}</dt><dd>{fmt(doc.date)}</dd></>)}
        </dl>
      </section>

      <h1 className="mt-8 font-display text-lg font-semibold">{doc.title}</h1>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-neutral-300 text-neutral-500">
            <tr><th className="py-2 font-medium">Description</th><th className="py-2 text-right font-medium">Qty</th><th className="py-2 text-right font-medium">Unit price</th><th className="py-2 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {doc.items.map((i, idx) => (
              <tr key={idx}>
                <td className="py-2.5 pr-4">{i.description}</td>
                <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{money(i.unitAmount)}</td>
                <td className="py-2.5 text-right tabular-nums">{money(lineTotal(i))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-6 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm tabular-nums">
        <dt className="text-neutral-500">Subtotal</dt><dd className="text-right">{money(t.subtotal)}</dd>
        {doc.taxBp > 0 && (<><dt className="text-neutral-500">Tax ({doc.taxBp / 100}%)</dt><dd className="text-right">{money(t.tax)}</dd></>)}
        <dt className="border-t border-neutral-300 pt-2 font-semibold">Total</dt><dd className="border-t border-neutral-300 pt-2 text-right font-semibold">{money(t.total)}</dd>
        {doc.kind === "invoice" && paid > 0 && (<><dt className="text-neutral-500">Paid</dt><dd className="text-right">−{money(paid)}</dd></>)}
        {doc.kind === "invoice" && (<><dt className="font-semibold">Balance due</dt><dd className="text-right font-semibold">{money(balance)}</dd></>)}
      </dl>

      {doc.payments && doc.payments.length > 0 && (
        <section className="mt-8 text-sm">
          <h2 className="font-semibold">Payments received</h2>
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
        <section className="mt-8 text-sm">
          <h2 className="font-semibold">{doc.kind === "quote" ? "Notes and terms" : "Payment details and notes"}</h2>
          <p className="mt-1 whitespace-pre-line text-neutral-700">{doc.notes}</p>
        </section>
      )}
    </article>
  );
}
