"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/actions/billing";

const LABEL = { paystack: "Pay with MoMo or card", stripe: "Pay by card" } as const;

export function PayButtons({ token, providers, amountLabel }: { token: string; providers: ("paystack" | "stripe")[]; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 print:hidden">
      <h2 className="font-semibold">Pay online</h2>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <Button
            key={p}
            disabled={pending}
            onClick={() => {
              setBusy(p);
              start(async () => {
                const r = await startCheckout(token, p);
                if (r.success && r.url) window.location.assign(r.url);
                else {
                  toast.error(r.message);
                  setBusy(null);
                }
              });
            }}
          >
            {pending && busy === p && <Loader2 className="size-4 animate-spin" />} {LABEL[p]} ({amountLabel})
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">You will be taken to a secure payment page. We never see your card details.</p>
    </div>
  );
}
