"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDashed, Copy, Loader2, ShieldCheck } from "lucide-react";
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}

function Status({ name, ready, mode, hookReady }: { name: string; ready: boolean; mode: "test" | "live" | null; hookReady?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={`flex size-9 items-center justify-center rounded-full ${ready ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
        {ready ? <ShieldCheck className="size-5" /> : <CircleDashed className="size-5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">
          {ready ? `Connected${mode ? ` · ${mode} mode` : ""}${hookReady === false ? " · webhook secret missing" : ""}` : "Not connected"}
        </p>
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
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Status name="Paystack" ready={paystackReady} mode={paystack.mode} />
        <Status name="Stripe" ready={stripeReady} mode={stripe.mode} hookReady={stripeReady ? stripeWebhook.source !== null : undefined} />
      </div>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Paystack</h2>
          <p className="text-sm text-muted-foreground">Cards and mobile money in GHS, NGN and USD.</p>
        </div>
        <ol className="space-y-5">
          <Step n={1} title="Add your secret key"><p className="text-xs text-muted-foreground">Paystack dashboard, Settings, API Keys &amp; Webhooks.</p><KeyRow s={paystack} /></Step>
          <Step n={2} title="Add the webhook"><CopyField label="Webhook URL (paste into Paystack)" value={paystackHook} /></Step>
          <Step n={3} title="Check it works">
            <Button type="button" size="sm" variant="outline" disabled={pending || !paystackReady} onClick={() => test("paystack")}>{pending && <Loader2 className="size-4 animate-spin" />} Test connection</Button>
          </Step>
        </ol>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Stripe</h2>
          <p className="text-sm text-muted-foreground">Cards in USD, EUR and GBP.</p>
        </div>
        <ol className="space-y-5">
          <Step n={1} title="Add your secret key"><KeyRow s={stripe} /></Step>
          <Step n={2} title="Add the webhook endpoint">
            <p className="text-xs text-muted-foreground">Listen for the event <code>checkout.session.completed</code>.</p>
            <CopyField label="Webhook URL (paste into Stripe)" value={stripeHook} />
          </Step>
          <Step n={3} title="Add the webhook signing secret"><KeyRow s={stripeWebhook} /></Step>
          <Step n={4} title="Check it works">
            <Button type="button" size="sm" variant="outline" disabled={pending || !stripeReady} onClick={() => test("stripe")}>{pending && <Loader2 className="size-4 animate-spin" />} Test connection</Button>
          </Step>
        </ol>
      </section>
    </div>
  );
}
