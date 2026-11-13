"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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

  const card = "rounded-2xl border border-border bg-card p-5 sm:p-6";
  const noClients = clients.length === 0;
  const filled = v.items.filter((i) => i.description.trim()).length;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-6">
        <section className={card} aria-labelledby="d-h-details">
          <h2 id="d-h-details" className="mb-4 font-display text-base font-semibold">1. Details</h2>
          {noClients && <p role="alert" className="mb-4 rounded-xl border border-border bg-secondary/50 p-3 text-sm">No clients yet. <Link href="/admin/clients" className="font-medium underline">Add a client</Link> first, then come back.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="d-client">Client</Label>
              <select id="d-client" className={selectCls} value={v.clientId} onChange={(e) => setV((p) => ({ ...p, clientId: e.target.value, projectId: "" }))} required>
                <option value="">Choose a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="d-project">Project <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <select id="d-project" className={selectCls} value={v.projectId} onChange={(e) => set("projectId", e.target.value)} disabled={!clientProjects.length}>
                <option value="">{v.clientId && !clientProjects.length ? "This client has no projects" : "None"}</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" className="mt-1.5" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Website redesign" required maxLength={140} />
              <p className="mt-1 text-xs text-muted-foreground">Shown at the top of the {kind} your client sees.</p>
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
            {kind === "quote" && (
              <div className="sm:col-span-2 sm:max-w-xs">
                <Label htmlFor="d-deposit">Deposit % <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="d-deposit" className="mt-1.5" inputMode="numeric" value={v.depositPercent ?? ""} onChange={(e) => set("depositPercent", e.target.value)} placeholder="e.g. 50" />
                <p className="mt-1 text-xs text-muted-foreground">When accepted, you can invoice this share up front and the rest later.</p>
              </div>
            )}
          </div>
        </section>

        <fieldset className={card}>
          <legend className="sr-only">Line items</legend>
          <h2 className="mb-4 font-display text-base font-semibold" aria-hidden="true">2. Line items</h2>
          <div className="hidden grid-cols-[1fr_5rem_8rem_7rem_2.5rem] gap-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Description</span><span>Qty</span><span>Unit price</span><span className="text-right">Amount</span><span />
          </div>
          <div className="space-y-3">
            {v.items.map((it, i) => {
              const amount = (Math.max(0, Math.floor(Number(it.quantity) || 0))) * (parseMoney(it.unit) ?? 0);
              return (
                <div key={i} className="grid gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_5rem_8rem_7rem_2.5rem] sm:items-center sm:border-0 sm:p-0">
                  <Input aria-label={`Line ${i + 1} description`} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="What are you charging for?" maxLength={300} />
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} placeholder="Qty" />
                    <Input aria-label={`Line ${i + 1} unit price`} inputMode="decimal" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className="text-sm font-medium tabular-nums sm:text-right">{formatMoney(amount, v.currency)}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} disabled={v.items.length === 1} onClick={() => setV((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setV((p) => ({ ...p, items: [...p.items, { description: "", quantity: "1", unit: "" }] }))}>
              <Plus className="size-4" /> Add line
            </Button>
            <p className="text-xs text-muted-foreground">Use a negative price for a discount.</p>
          </div>
        </fieldset>

        <section className={card}>
          <h2 className="mb-3 font-display text-base font-semibold">3. Notes</h2>
          <Label htmlFor="d-notes" className="sr-only">{kind === "quote" ? "Notes and terms" : "Payment details and notes"}</Label>
          <Textarea id="d-notes" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={4000}
            placeholder={kind === "quote" ? "Scope, timeline, 50% deposit to start…" : "Anything extra for the client. Your bank and mobile money details come from Billing settings."} />
          <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{v.notes.length}/4000</p>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <div className={card} aria-live="polite">
          <h2 className="font-display text-base font-semibold">Summary</h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-muted-foreground">Items</dt><dd className="text-right">{filled}</dd>
            <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right">{formatMoney(sum.subtotal, v.currency)}</dd>
            <dt className="text-muted-foreground">Tax</dt><dd className="text-right">{formatMoney(sum.tax, v.currency)}</dd>
            <dt className="border-t border-border pt-2 text-base font-semibold">Total</dt><dd className="border-t border-border pt-2 text-right font-display text-xl font-bold">{formatMoney(sum.total, v.currency)}</dd>
          </dl>
          <Button type="submit" className="mt-5 w-full" disabled={pending || noClients}>{pending && <Loader2 className="size-4 animate-spin" />} {id ? "Save changes" : `Create ${kind}`}</Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{id ? "Changes save to the draft." : "Saved as a draft. You send it from the next page."}</p>
        </div>
      </aside>
    </form>
  );
}
