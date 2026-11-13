"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, formatMoney, parseMoney, parseTaxPercent, totals } from "@/lib/billing";
import { saveInvoice, saveQuote, type DocInput } from "@/lib/actions/billing";

export type EditorClient = { id: string; label: string };
export type EditorProject = { id: string; userId: string; title: string };

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

/** Create or edit a draft quote or invoice. Totals update live; the server re-checks everything on save. */
export function DocumentEditor({
  kind, id, clients, projects, initial, submissionId,
}: {
  kind: "quote" | "invoice";
  id: string | null;
  clients: EditorClient[];
  projects: EditorProject[];
  initial: DocInput;
  submissionId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<DocInput>(initial);
  const set = <K extends keyof DocInput>(k: K, val: DocInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const setItem = (i: number, patch: Partial<DocInput["items"][number]>) =>
    setV((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  const clientProjects = useMemo(() => projects.filter((p) => p.userId === v.clientId), [projects, v.clientId]);
  const sum = useMemo(() => {
    const items = v.items.map((i) => ({ description: i.description, quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)), unitAmount: parseMoney(i.unit) ?? 0 }));
    return totals(items, parseTaxPercent(v.taxPercent) ?? 0);
  }, [v.items, v.taxPercent]);

  const save = () =>
    start(async () => {
      const r = kind === "quote" ? await saveQuote(id, v, submissionId) : await saveInvoice(id, v);
      if (!r.success) {
        toast.error(r.message);
        return;
      }
      toast.success(r.message);
      if (!id && r.id) router.replace(`/admin/billing/${kind}s/${r.id}`);
      else router.refresh();
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="d-client">Client</Label>
          <select id="d-client" className={selectCls} value={v.clientId} onChange={(e) => setV((p) => ({ ...p, clientId: e.target.value, projectId: "" }))} required>
            <option value="">Choose a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="d-project">Project (optional)</Label>
          <select id="d-project" className={selectCls} value={v.projectId} onChange={(e) => set("projectId", e.target.value)} disabled={!clientProjects.length}>
            <option value="">None</option>
            {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="d-title">Title</Label>
          <Input id="d-title" className="mt-1.5" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Website redesign" required maxLength={140} />
        </div>
        <div>
          <Label htmlFor="d-currency">Currency</Label>
          <select id="d-currency" className={selectCls} value={v.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="d-tax">Tax %</Label>
            <Input id="d-tax" className="mt-1.5" inputMode="decimal" value={v.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label htmlFor="d-date">{kind === "quote" ? "Valid until" : "Due date"}</Label>
            <Input id="d-date" type="date" className="mt-1.5" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </div>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">Line items</legend>
        <div className="hidden grid-cols-[1fr_5rem_8rem_8rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
          <span>Description</span><span>Qty</span><span>Unit price</span><span className="text-right">Amount</span><span />
        </div>
        {v.items.map((it, i) => {
          const amount = (Math.max(0, Math.floor(Number(it.quantity) || 0))) * (parseMoney(it.unit) ?? 0);
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_8rem_2.5rem] sm:items-center">
              <Input aria-label={`Line ${i + 1} description`} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Description" maxLength={300} />
              <Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
              <Input aria-label={`Line ${i + 1} unit price`} inputMode="decimal" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} placeholder="0.00" />
              <span className="text-sm tabular-nums sm:text-right">{formatMoney(amount, v.currency)}</span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} disabled={v.items.length === 1} onClick={() => setV((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setV((p) => ({ ...p, items: [...p.items, { description: "", quantity: "1", unit: "" }] }))}>
          <Plus className="size-4" /> Add line
        </Button>
      </fieldset>

      <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
        <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right">{formatMoney(sum.subtotal, v.currency)}</dd>
        <dt className="text-muted-foreground">Tax</dt><dd className="text-right">{formatMoney(sum.tax, v.currency)}</dd>
        <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{formatMoney(sum.total, v.currency)}</dd>
      </dl>

      <div>
        <Label htmlFor="d-notes">{kind === "quote" ? "Notes and terms" : "Payment details and notes"}</Label>
        <Textarea id="d-notes" className="mt-1.5" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={4000}
          placeholder={kind === "quote" ? "Scope, timeline, 50% deposit to start…" : "Bank name, account number, mobile money number, reference to quote…"} />
      </div>

      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {id ? "Save changes" : `Create ${kind}`}</Button>
    </form>
  );
}
