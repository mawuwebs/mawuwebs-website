"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { sendNewsletter, type SendState } from "@/lib/actions/newsletter";

const initial: SendState = { success: false, message: "" };

export function NewsletterSendForm({ count, mailReady }: { count: number; mailReady: boolean }) {
  const [state, formAction, pending] = useActionState(sendNewsletter, initial);
  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      {!mailReady && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Email isn&apos;t configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM in .env, then restart.
        </p>
      )}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" required rows={12} className="mt-1.5" placeholder="Plain text. Links are made clickable automatically. An unsubscribe link is added at the bottom." />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" value="yes" className="mt-1" />
        <span>Send this to all {count} confirmed subscriber{count === 1 ? "" : "s"}. This can&apos;t be undone.</span>
      </label>
      {state.message && (
        <p role="status" className={state.success ? "text-sm text-success" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending || !mailReady || count === 0}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send newsletter
      </Button>
    </form>
  );
}
