"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyPaymentByToken } from "@/lib/actions/billing";

const METHODS = [["momo", "Mobile money"], ["bank", "Bank transfer"], ["cash", "Cash"], ["other", "Other"]] as const;

/** "I've already paid" form for clients who pay by transfer or MoMo. Tells staff; does not mark anything paid. */
export function PaidNote({ token, number }: { token: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [v, setV] = useState({ method: "momo", reference: "", note: "" });
  const [pending, start] = useTransition();
  if (done) return <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm print:hidden">{done}</p>;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Already paid by mobile money or bank transfer?</h2>
          <p className="text-sm text-muted-foreground">Tell us your reference and we will confirm it.</p>
        </div>
        {!open && <Button variant="outline" onClick={() => setOpen(true)}>I have paid</Button>}
      </div>
      {open && (
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await notifyPaymentByToken(token, v); if (r.success) setDone(r.message); else toast.error(r.message); }); }}>
          <div>
            <Label htmlFor="pn-method">How did you pay?</Label>
            <select id="pn-method" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })}>
              {METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pn-ref">Transaction or reference no.</Label>
            <Input id="pn-ref" className="mt-1.5" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} required minLength={3} maxLength={120} placeholder={`e.g. MTN transaction ID, or ${number}`} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="pn-note">Note (optional)</Label>
            <Input id="pn-note" className="mt-1.5" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={500} placeholder="Amount, date, who paid" />
          </div>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Send payment details</Button></div>
        </form>
      )}
    </div>
  );
}
