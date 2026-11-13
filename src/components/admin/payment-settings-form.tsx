"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removePaymentKey, savePaymentKey, testGateway, type SettingResult } from "@/lib/actions/payment-settings";

export type FieldStatus = {
  field: "paystack" | "stripe" | "stripeWebhook";
  label: string;
  placeholder: string;
  source: "admin" | "env" | null;
  mode: "test" | "live" | null;
  last4: string | null;
  unreadable: boolean;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" size="icon" aria-label={`Copy ${label}`} onClick={async () => { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>
          {done ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function KeyRow({ s }: { s: FieldStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState("");
  const run = (fn: () => Promise<SettingResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
      if (r.success) { after?.(); router.refresh(); }
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`k-${s.field}`}>{s.label}</Label>
        {s.source === null && <Badge variant="outline">Not set</Badge>}
        {s.source === "admin" && <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Saved {s.mode ? `(${s.mode})` : ""} ••••{s.last4}</Badge>}
        {s.source === "env" && <Badge variant="outline">From server environment {s.mode ? `(${s.mode})` : ""}</Badge>}
        {s.unreadable && <Badge variant="outline" className="border-destructive/40 text-destructive">Saved value unreadable: enter it again</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input id={`k-${s.field}`} type="password" autoComplete="off" spellCheck={false} className="max-w-md font-mono text-xs" placeholder={s.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="button" size="sm" disabled={pending || !value.trim()} onClick={() => run(() => savePaymentKey(s.field, value), () => setValue(""))}>
          {pending && <Loader2 className="size-4 animate-spin" />} {s.source === "admin" ? "Replace" : "Save"}
        </Button>
        {s.source === "admin" && <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removePaymentKey(s.field))}>Remove</Button>}
      </div>
    </div>
  );
}

export function PaymentSettingsForm({
  paystack, stripe, stripeWebhook, paystackHook, stripeHook, paystackReady, stripeReady,
}: {
  paystack: FieldStatus; stripe: FieldStatus; stripeWebhook: FieldStatus; paystackHook: string; stripeHook: string; paystackReady: boolean; stripeReady: boolean;
}) {
  const [pending, start] = useTransition();
  const test = (p: "paystack" | "stripe") => start(async () => { const r = await testGateway(p); (r.success ? toast.success : toast.error)(r.message); });
  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Paystack</h2>
          <p className="text-sm text-muted-foreground">Cards and mobile money in GHS, NGN and USD. Dashboard, Settings, API Keys &amp; Webhooks.</p>
        </div>
        <KeyRow s={paystack} />
        <CopyField label="Webhook URL (paste into Paystack)" value={paystackHook} />
        <Button type="button" size="sm" variant="outline" disabled={pending || !paystackReady} onClick={() => test("paystack")}>{pending && <Loader2 className="size-4 animate-spin" />} Test connection</Button>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Stripe</h2>
          <p className="text-sm text-muted-foreground">Cards in USD, EUR and GBP. Add an endpoint for the event <code>checkout.session.completed</code>.</p>
        </div>
        <KeyRow s={stripe} />
        <CopyField label="Webhook URL (paste into Stripe)" value={stripeHook} />
        <KeyRow s={stripeWebhook} />
        <Button type="button" size="sm" variant="outline" disabled={pending || !stripeReady} onClick={() => test("stripe")}>{pending && <Loader2 className="size-4 animate-spin" />} Test connection</Button>
      </section>
    </div>
  );
}
