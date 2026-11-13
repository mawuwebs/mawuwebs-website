"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, formatMoney, minorToInput } from "@/lib/billing";
import {
  createInvoiceFromQuote, deleteDraft, deletePayment, duplicateDocument, recordPayment, recordRefund, regenerateLink, sendInvoice, sendQuote, voidInvoice,
  type BillingResult,
} from "@/lib/actions/billing";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<BillingResult>, after?: (r: BillingResult) => void) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message, { duration: r.message.length > 80 ? 12000 : 4000 });
      if (r.success) {
        if (after) after(r);
        else router.refresh();
      }
    });
  return { run, pending };
}

/** Two-step button for actions that are hard to undo. */
function Confirm({ label, confirmLabel, onConfirm, disabled }: { label: string; confirmLabel: string; onConfirm: () => void; disabled: boolean }) {
  const [sure, setSure] = useState(false);
  return sure ? (
    <Button size="sm" variant="destructive" disabled={disabled} onClick={() => { setSure(false); onConfirm(); }}>{confirmLabel}</Button>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setSure(true)}>{label}</Button>
  );
}

/** Duplicate for every document; replace-link only once a client link exists. */
function CommonActions({ kind, id, hasLink }: { kind: "quote" | "invoice"; id: string; hasLink: boolean }) {
  const router = useRouter();
  const { run, pending } = useRun();
  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => duplicateDocument(kind, id), (r) => router.push(`/admin/billing/${kind}s/${r.id}`))}>Duplicate as draft</Button>
      {hasLink && <Confirm label="Replace client link" confirmLabel="Confirm: old link stops working" disabled={pending} onConfirm={() => run(() => regenerateLink(kind, id))} />}
    </>
  );
}

export function QuoteActions({ id, status, depositPct, invoiceKinds }: { id: string; status: string; depositPct: number; invoiceKinds: string[] }) {
  const router = useRouter();
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {(status === "DRAFT" || status === "SENT") && (
        <Button size="sm" disabled={pending} onClick={() => run(() => sendQuote(id))}>
          {pending && <Loader2 className="size-4 animate-spin" />} {status === "DRAFT" ? "Email to client" : "Resend email"}
        </Button>
      )}
      {status === "ACCEPTED" && invoiceKinds.length === 0 && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => createInvoiceFromQuote(id, "full"), (r) => router.push(`/admin/billing/invoices/${r.id}`))}>Create invoice</Button>
          {depositPct > 0 && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => createInvoiceFromQuote(id, "deposit"), (r) => router.push(`/admin/billing/invoices/${r.id}`))}>Create {depositPct}% deposit invoice</Button>}
        </>
      )}
      {status === "ACCEPTED" && depositPct > 0 && invoiceKinds.includes("deposit") && !invoiceKinds.includes("balance") && (
        <Button size="sm" disabled={pending} onClick={() => run(() => createInvoiceFromQuote(id, "balance"), (r) => router.push(`/admin/billing/invoices/${r.id}`))}>Create balance invoice</Button>
      )}
      {status === "DRAFT" && (
        <Confirm label="Delete draft" confirmLabel="Confirm: delete" disabled={pending} onConfirm={() => run(() => deleteDraft("quote", id), () => router.push("/admin/billing"))} />
      )}
      <CommonActions kind="quote" id={id} hasLink={status !== "DRAFT"} />
    </div>
  );
}

export function InvoiceActions({ id, status, hasPayments }: { id: string; status: string; hasPayments: boolean }) {
  const router = useRouter();
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {(status === "DRAFT" || status === "SENT") && (
        <Button size="sm" disabled={pending} onClick={() => run(() => sendInvoice(id))}>
          {pending && <Loader2 className="size-4 animate-spin" />} {status === "DRAFT" ? "Email to client" : "Resend email"}
        </Button>
      )}
      {status === "DRAFT" && (
        <Confirm label="Delete draft" confirmLabel="Confirm: delete" disabled={pending} onConfirm={() => run(() => deleteDraft("invoice", id), () => router.push("/admin/billing"))} />
      )}
      {(status === "SENT") && !hasPayments && (
        <Confirm label="Void invoice" confirmLabel="Confirm: void" disabled={pending} onConfirm={() => run(() => voidInvoice(id))} />
      )}
      <CommonActions kind="invoice" id={id} hasLink={status !== "DRAFT"} />
    </div>
  );
}

export function PaymentForm({ invoiceId, currency, balance }: { invoiceId: string; currency: string; balance: number }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [amount, setAmount] = useState(minorToInput(balance));
  const [method, setMethod] = useState<string>("momo");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordPayment(invoiceId, { amount, method, reference, note, paidAt }), () => {
          setReference("");
          setNote("");
          router.refresh();
        });
      }}
      className="grid gap-3 sm:grid-cols-5"
    >
      <div><Label htmlFor="p-amount">Amount ({currency})</Label><Input id="p-amount" className="mt-1.5" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
      <div>
        <Label htmlFor="p-method">Method</Label>
        <select id="p-method" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
        </select>
      </div>
      <div><Label htmlFor="p-date">Date received</Label><Input id="p-date" type="date" className="mt-1.5" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
      <div><Label htmlFor="p-ref">Reference</Label><Input id="p-ref" className="mt-1.5" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="MoMo txn ID" maxLength={120} /></div>
      <div><Label htmlFor="p-note">Note</Label><Input id="p-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
      <div className="sm:col-span-5 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Record payment</Button>
        <span className="text-sm text-muted-foreground">Balance due: {formatMoney(balance, currency)}</span>
      </div>
    </form>
  );
}

export function RemovePaymentButton({ id }: { id: string }) {
  const { run, pending } = useRun();
  return (
    <Confirm label="Remove" confirmLabel="Confirm: remove" disabled={pending} onConfirm={() => run(() => deletePayment(id))} />
  );
}

export function RefundForm({ invoiceId, currency, maxRefund }: { invoiceId: string; currency: string; maxRefund: number }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordRefund(invoiceId, { amount, note }), () => {
          setAmount("");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div><Label htmlFor="rf-amount">Amount ({currency})</Label><Input id="rf-amount" className="mt-1.5" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
      <div className="sm:col-span-2"><Label htmlFor="rf-note">Note</Label><Input id="rf-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason, or how it was returned" maxLength={500} /></div>
      <div className="flex items-end"><Button type="submit" size="sm" variant="outline" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Record refund</Button></div>
      <p className="text-xs text-muted-foreground sm:col-span-4">Up to {formatMoney(maxRefund, currency)} received so far. For card or Paystack payments, refund in the gateway dashboard instead; it is recorded here automatically.</p>
    </form>
  );
}
