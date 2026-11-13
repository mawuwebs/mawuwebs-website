"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setProgressEmails } from "@/lib/actions/updates";

export function ProgressOptOut({ userId, token, initialOn }: { userId: string; token: string; initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <p>{on ? "You currently get a short project progress email each week." : "Weekly progress emails are off."}</p>
      <Button type="button" disabled={pending} onClick={() => start(async () => {
        const r = await setProgressEmails(userId, token, !on);
        setMessage(r.message);
        if (r.done) setOn(!on);
      })}>{on ? "Stop progress emails" : "Turn progress emails back on"}</Button>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
