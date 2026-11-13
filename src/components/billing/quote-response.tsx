"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { answerQuoteByToken, answerQuoteInPortal } from "@/lib/actions/billing";

/** Accept or decline a sent quote. `token` for the emailed link, `quoteId` inside the signed-in portal. */
export function QuoteResponse({ token, quoteId, defaultName = "" }: { token?: string; quoteId?: string; defaultName?: string }) {
  const [name, setName] = useState(defaultName);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmDecline, setConfirmDecline] = useState(false);

  const answer = (decision: "ACCEPTED" | "DECLINED") =>
    start(async () => {
      const r = token ? await answerQuoteByToken(token, decision, name) : await answerQuoteInPortal(quoteId ?? "", decision);
      if (r.success) setDone(r.message);
      else toast.error(r.message);
    });

  if (done) return <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm">{done}</p>;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 print:hidden">
      <h2 className="font-semibold">Your decision</h2>
      {token && (
        <div className="max-w-sm">
          <Label htmlFor="q-name">Type your full name to accept</Label>
          <Input id="q-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1.5" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || (!!token && name.trim().length < 2)} onClick={() => answer("ACCEPTED")}>Accept quote</Button>
        {confirmDecline ? (
          <Button variant="destructive" disabled={pending} onClick={() => answer("DECLINED")}>Confirm: decline</Button>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => setConfirmDecline(true)}>Decline</Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Accepting records your name and the time. We will confirm next steps by email.</p>
    </div>
  );
}
