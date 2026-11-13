"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, bpToPercent } from "@/lib/billing";
import { saveBillingSettings } from "@/lib/actions/billing";
import type { BillingSettingsValues } from "@/lib/billing-settings";

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function BillingSettingsForm({ initial }: { initial: BillingSettingsValues }) {
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    legalName: initial.legalName, taxId: initial.taxId, paymentInstructions: initial.paymentInstructions, quoteTerms: initial.quoteTerms,
    defaultCurrency: initial.defaultCurrency, defaultTaxPercent: bpToPercent(initial.defaultTaxBp), defaultDueDays: String(initial.defaultDueDays),
    remindersEnabled: initial.remindersEnabled,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveBillingSettings({ ...v, defaultCurrency: v.defaultCurrency as (typeof CURRENCIES)[number], defaultDueDays: Number(v.defaultDueDays) });
          (r.success ? toast.success : toast.error)(r.message);
        });
      }}
    >
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Who is billing</h2>
        <div><Label htmlFor="b-legal">Legal / trading name</Label><Input id="b-legal" className="mt-1.5" value={v.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="Leave blank to use the site name" maxLength={160} /></div>
        <div><Label htmlFor="b-tax">Tax ID (TIN / VAT number)</Label><Input id="b-tax" className="mt-1.5" value={v.taxId} onChange={(e) => set("taxId", e.target.value)} maxLength={60} /></div>
        <p className="text-xs text-muted-foreground sm:col-span-2">Shown on every quote and invoice. Address, phone and email come from Site Settings.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Payment instructions</h2>
        <div>
          <Label htmlFor="b-pay">Shown as &ldquo;How to pay&rdquo; on invoices</Label>
          <Textarea id="b-pay" className="mt-1.5" rows={5} value={v.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} maxLength={2000} placeholder={"Mobile money: MTN 024 000 0000 (Your Name)\nBank: Bank name, account number, branch"} />
        </div>
        <div>
          <Label htmlFor="b-terms">Default quote terms</Label>
          <Textarea id="b-terms" className="mt-1.5" rows={4} value={v.quoteTerms} onChange={(e) => set("quoteTerms", e.target.value)} maxLength={4000} placeholder="Scope, timeline, revisions included, what is not covered…" />
          <p className="mt-1 text-xs text-muted-foreground">Pre-filled into the notes of each new quote. You can edit it per quote.</p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
        <h2 className="font-semibold sm:col-span-3">Defaults for new documents</h2>
        <div><Label htmlFor="b-cur">Currency</Label><select id="b-cur" className={selectCls} value={v.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><Label htmlFor="b-vat">Tax %</Label><Input id="b-vat" className="mt-1.5" inputMode="decimal" value={v.defaultTaxPercent} onChange={(e) => set("defaultTaxPercent", e.target.value)} /></div>
        <div><Label htmlFor="b-due">Payment terms (days)</Label><Input id="b-due" className="mt-1.5" inputMode="numeric" value={v.defaultDueDays} onChange={(e) => set("defaultDueDays", e.target.value)} /></div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={v.remindersEnabled} onChange={(e) => set("remindersEnabled", e.target.checked)} />
          <span><strong className="block">Email overdue reminders</strong><span className="text-muted-foreground">A friendly reminder 3 days after the due date and a final one at 14 days. Needs the daily cron call to <code>/api/cron/invoice-reminders</code> and working email.</span></span>
        </label>
      </section>

      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save settings</Button>
    </form>
  );
}
