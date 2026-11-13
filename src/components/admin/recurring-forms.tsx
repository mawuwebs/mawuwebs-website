"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@/lib/billing";
import { deleteRecurring, saveRecurring, setRecurringActive } from "@/lib/actions/billing";

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const blank = { title: "", description: "", amount: "", currency: "GHS", taxPercent: "", intervalMonths: "1", dueDays: "14", notes: "", firstRun: "", autoSend: false };

export function RecurringForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(blank);
  const set = <K extends keyof typeof blank>(k: K, val: (typeof blank)[K]) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveRecurring(clientId, v);
          if (!r.success) {
            toast.error(r.message);
            return;
          }
          toast.success(r.message);
          setV(blank);
          router.refresh();
        });
      }}
    >
      <div className="sm:col-span-2"><Label htmlFor="r-title">Invoice title</Label><Input id="r-title" className="mt-1.5" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Managed IT support" required maxLength={140} /></div>
      <div className="sm:col-span-2"><Label htmlFor="r-desc">Line description</Label><Input id="r-desc" className="mt-1.5" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Monthly support plan, up to 10 devices" required maxLength={300} /></div>
      <div><Label htmlFor="r-amount">Amount</Label><Input id="r-amount" className="mt-1.5" inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
      <div><Label htmlFor="r-cur">Currency</Label><select id="r-cur" className={selectCls} value={v.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><Label htmlFor="r-tax">Tax %</Label><Input id="r-tax" className="mt-1.5" inputMode="decimal" value={v.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} /></div>
      <div>
        <Label htmlFor="r-int">Repeat</Label>
        <select id="r-int" className={selectCls} value={v.intervalMonths} onChange={(e) => set("intervalMonths", e.target.value)}>
          <option value="1">Monthly</option><option value="2">Every 2 months</option><option value="3">Quarterly</option><option value="6">Every 6 months</option><option value="12">Yearly</option>
        </select>
      </div>
      <div><Label htmlFor="r-first">First invoice on</Label><Input id="r-first" type="date" className="mt-1.5" value={v.firstRun} onChange={(e) => set("firstRun", e.target.value)} required /></div>
      <div><Label htmlFor="r-due">Payment terms (days)</Label><Input id="r-due" className="mt-1.5" inputMode="numeric" value={v.dueDays} onChange={(e) => set("dueDays", e.target.value)} /></div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4" checked={v.autoSend} onChange={(e) => set("autoSend", e.target.checked)} /> Email it to the client automatically (otherwise it waits as a draft)</label>
      <div className="sm:col-span-4"><Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Set up recurring billing</Button></div>
    </form>
  );
}

export function RecurringRowActions({ id, clientId, active }: { id: string; clientId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sure, setSure] = useState(false);
  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
      router.refresh();
    });
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setRecurringActive(id, clientId, !active))}>{active ? "Pause" : "Resume"}</Button>
      {sure ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => { setSure(false); run(() => deleteRecurring(id, clientId)); }}>Confirm: delete</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>
      )}
    </div>
  );
}
