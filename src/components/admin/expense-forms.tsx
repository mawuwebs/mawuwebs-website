"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CURRENCIES, PAYMENT_METHOD_LABEL } from "@/lib/billing";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, EXPENSE_METHODS, type ExpenseInput, type RecurringExpenseInput } from "@/lib/expenses";
import {
  addBillableExpenses, attachReceipt, deleteExpense, deleteRecurringExpense, removeReceipt, restoreExpense, saveExpense, saveRecurringExpense, setRecurringExpenseActive,
} from "@/lib/actions/expenses";

type ProjectOpt = { id: string; title: string; client: string };
type Result = { success: boolean; message: string };

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const today = () => new Date().toISOString().slice(0, 10);
const blank = (): ExpenseInput => ({ description: "", vendor: "", category: "software", amount: "", taxAmount: "", currency: "GHS", method: "momo", reference: "", note: "", projectId: "", billable: false, spentAt: today() });

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, after?: (r: Result) => void) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
      if (r.success) after?.(r);
      router.refresh();
    });
  return { pending, run };
}

export function ExpenseForm({ projects, initial, id, onDone }: { projects: ProjectOpt[]; initial?: ExpenseInput; id?: string; onDone?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<ExpenseInput>(initial ?? blank());
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ExpenseInput>(k: K, val: ExpenseInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const k = id ?? "new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveExpense(v, id);
          if (!r.success) {
            toast.error(r.message);
            return;
          }
          const chosen = file.current?.files?.[0];
          if (chosen && r.id) {
            const fd = new FormData();
            fd.set("file", chosen);
            const up = await attachReceipt(r.id, fd);
            if (!up.success) toast.error(`Saved, but the receipt failed: ${up.message}`);
            else toast.success("Expense and receipt saved.");
          } else toast.success(r.message);
          if (!id) {
            setV(blank());
            if (file.current) file.current.value = "";
          }
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="sm:col-span-2"><Label htmlFor={`x-desc-${k}`}>What was it for?</Label><Input id={`x-desc-${k}`} className="mt-1.5" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Hostinger annual plan" required maxLength={200} /></div>
      <div><Label htmlFor={`x-vendor-${k}`}>Paid to</Label><Input id={`x-vendor-${k}`} className="mt-1.5" value={v.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Vendor or person" maxLength={120} /></div>
      <div><Label htmlFor={`x-date-${k}`}>Date paid</Label><Input id={`x-date-${k}`} type="date" className="mt-1.5" value={v.spentAt} max={today()} onChange={(e) => set("spentAt", e.target.value)} required /></div>
      <div><Label htmlFor={`x-amount-${k}`}>Amount (incl. tax)</Label><Input id={`x-amount-${k}`} className="mt-1.5" inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
      <div><Label htmlFor={`x-tax-${k}`}>Of which tax</Label><Input id={`x-tax-${k}`} className="mt-1.5" inputMode="decimal" value={v.taxAmount} onChange={(e) => set("taxAmount", e.target.value)} placeholder="Optional" /></div>
      <div><Label htmlFor={`x-cur-${k}`}>Currency</Label><select id={`x-cur-${k}`} className={selectCls} value={v.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><Label htmlFor={`x-method-${k}`}>Paid by</Label><select id={`x-method-${k}`} className={selectCls} value={v.method} onChange={(e) => set("method", e.target.value)}>{EXPENSE_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m] ?? m}</option>)}</select></div>
      <div className="sm:col-span-2"><Label htmlFor={`x-cat-${k}`}>Category</Label><select id={`x-cat-${k}`} className={selectCls} value={v.category} onChange={(e) => set("category", e.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>)}</select></div>
      <div className="sm:col-span-2">
        <Label htmlFor={`x-proj-${k}`}>Client project (optional)</Label>
        <select id={`x-proj-${k}`} className={selectCls} value={v.projectId} onChange={(e) => set("projectId", e.target.value)}>
          <option value="">Not tied to a project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.client}: {p.title}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4" checked={v.billable} onChange={(e) => set("billable", e.target.checked)} /> Bill this cost to the client (needs a project)</label>
      <div><Label htmlFor={`x-ref-${k}`}>Reference</Label><Input id={`x-ref-${k}`} className="mt-1.5" value={v.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Receipt or txn no." maxLength={120} /></div>
      <div><Label htmlFor={`x-file-${k}`}>Receipt (JPG, PNG, PDF)</Label><input id={`x-file-${k}`} ref={file} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1.5 block h-10 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs" /></div>
      <div className="sm:col-span-4"><Label htmlFor={`x-note-${k}`}>Note</Label><Input id={`x-note-${k}`} className="mt-1.5" value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} /></div>
      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {id ? "Save changes" : "Add expense"}</Button>
        {onDone && <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>}
      </div>
    </form>
  );
}

export function ExpenseRowActions({ expense, projects, hasReceipt, locked }: { expense: { id: string } & ExpenseInput; projects: ProjectOpt[]; hasReceipt: boolean; locked: boolean }) {
  const { pending, run } = useRun();
  const [sure, setSure] = useState(false);
  const [editing, setEditing] = useState(false);
  const { id, ...initial } = expense;
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {hasReceipt && (
        <a href={`/admin/billing/expenses/${id}/receipt`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs underline underline-offset-2 hover:bg-secondary"><FileText className="size-3.5" /> Receipt</a>
      )}
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      {!locked && (sure ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => { setSure(false); run(() => deleteExpense(id)); }}>Confirm: delete</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>
      ))}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>{locked ? "On an invoice already: amount, currency and project are locked." : "Changes apply to the reports straight away."}</DialogDescription>
          </DialogHeader>
          <ExpenseForm projects={projects} initial={initial} id={id} onDone={() => setEditing(false)} />
          {hasReceipt && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => removeReceipt(id), () => setEditing(false))}><Paperclip className="size-4" /> Remove current receipt</Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RestoreExpenseButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => restoreExpense(id))}>Restore</Button>;
}

// ---------------------------------------------------------------------------
// Recurring
// ---------------------------------------------------------------------------

const blankRecurring = (): RecurringExpenseInput => ({ description: "", vendor: "", category: "hosting", amount: "", taxAmount: "", currency: "GHS", method: "card", intervalMonths: "12", firstRun: "", autoRecord: true });

export function RecurringExpenseForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(blankRecurring());
  const set = <K extends keyof RecurringExpenseInput>(k: K, val: RecurringExpenseInput[K]) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveRecurringExpense(v);
          (r.success ? toast.success : toast.error)(r.message);
          if (r.success) { setV(blankRecurring()); router.refresh(); }
        });
      }}
    >
      <div className="sm:col-span-2"><Label htmlFor="rx-desc">What repeats?</Label><Input id="rx-desc" className="mt-1.5" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Domain mawuwebs.com" required maxLength={200} /></div>
      <div><Label htmlFor="rx-vendor">Paid to</Label><Input id="rx-vendor" className="mt-1.5" value={v.vendor} onChange={(e) => set("vendor", e.target.value)} maxLength={120} /></div>
      <div><Label htmlFor="rx-cat">Category</Label><select id="rx-cat" className={selectCls} value={v.category} onChange={(e) => set("category", e.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>)}</select></div>
      <div><Label htmlFor="rx-amount">Amount (incl. tax)</Label><Input id="rx-amount" className="mt-1.5" inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
      <div><Label htmlFor="rx-tax">Of which tax</Label><Input id="rx-tax" className="mt-1.5" inputMode="decimal" value={v.taxAmount} onChange={(e) => set("taxAmount", e.target.value)} placeholder="Optional" /></div>
      <div><Label htmlFor="rx-cur">Currency</Label><select id="rx-cur" className={selectCls} value={v.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><Label htmlFor="rx-method">Paid by</Label><select id="rx-method" className={selectCls} value={v.method} onChange={(e) => set("method", e.target.value)}>{EXPENSE_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m] ?? m}</option>)}</select></div>
      <div>
        <Label htmlFor="rx-int">Repeats</Label>
        <select id="rx-int" className={selectCls} value={v.intervalMonths} onChange={(e) => set("intervalMonths", e.target.value)}>
          <option value="1">Monthly</option><option value="3">Quarterly</option><option value="6">Every 6 months</option><option value="12">Yearly</option><option value="24">Every 2 years</option>
        </select>
      </div>
      <div><Label htmlFor="rx-first">Next due on</Label><Input id="rx-first" type="date" className="mt-1.5" value={v.firstRun} onChange={(e) => set("firstRun", e.target.value)} required /></div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-3"><input type="checkbox" className="size-4" checked={v.autoRecord} onChange={(e) => set("autoRecord", e.target.checked)} /> Record it automatically on the due date (otherwise I get a reminder email and record it myself)</label>
      <div className="sm:col-span-4"><Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add recurring expense</Button></div>
    </form>
  );
}

export function RecurringExpenseActions({ id, active }: { id: string; active: boolean }) {
  const { pending, run } = useRun();
  const [sure, setSure] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setRecurringExpenseActive(id, !active))}>{active ? "Pause" : "Resume"}</Button>
      {sure ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => { setSure(false); run(() => deleteRecurringExpense(id)); }}>Confirm: delete</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>
      )}
    </div>
  );
}

/** On a draft invoice: pull the project's unbilled "bill to client" expenses in as line items. */
export function AddBillableExpensesButton({ invoiceId, count, label }: { invoiceId: string; count: number; label: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
      <span>{count} unbilled expense{count === 1 ? "" : "s"} for this project ({label}).</span>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => addBillableExpenses(invoiceId))}>
        {pending && <Loader2 className="size-4 animate-spin" />} Add to this invoice
      </Button>
      <span className="text-xs text-muted-foreground">Save any edits above first: adding reloads the lines.</span>
    </div>
  );
}
