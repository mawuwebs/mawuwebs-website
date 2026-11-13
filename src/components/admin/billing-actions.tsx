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
  createInvoiceFromQuote, deleteDraft, deletePayment, recordPayment, sendInvoice, sendQuote, voidInvoice,
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

export function QuoteActions({ id, status, hasInvoice }: { id: string; status: string; hasInvoice: boolean }) {
  const router = useRouter();
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {(status === "DRAFT" || status === "SENT") && (
        <Button size="sm" disabled={pending} onClick={() => run(() => sendQuote(id))}>
          {pending && <Loader2 className="size-4 animate-spin" />} {status === "DRAFT" ? "Email to client" : "Resend email"}
        </Button>
      )}
      {status === "ACCEPTED" && !hasInvoice && (
        <Button size="sm" disabled={pending} onClick={() => run(() => createInvoiceFromQuote(id), (r) => router.push(`/admin/billing/invoices/${r.id}`))}>Create invoice</Button>
      )}
      {status === "DRAFT" && (
        <Confirm label="Delete draft" confirmLabel="Confirm: delete" disabled={pending} onConfirm={() => run(() => deleteDraft("quote", id), () => router.push("/admin/billing"))} />
      )}
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
