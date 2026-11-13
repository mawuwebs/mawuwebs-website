"use client";

import { useActionState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { unlockToolkit } from "@/lib/actions/toolkit";
import type { NewsletterState } from "@/lib/actions/newsletter";

const initialState: NewsletterState = { success: false, message: "" };

export function ToolkitGate() {
  const [state, formAction, pending] = useActionState(unlockToolkit, initialState);
  return (
    <form action={formAction} className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
      <div className="hidden" aria-hidden>
        <input name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <label htmlFor="toolkit-email" className="font-display text-lg font-semibold">
        Enter your email to unlock all three
      </label>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {["All three templates, instantly on this page", "Copy or print them, free to adapt", "Occasional IT tips. Unsubscribe any time"].map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            {b}
          </li>
        ))}
      </ul>
      <Input id="toolkit-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="mt-4" />
      {state.message && !state.success && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-4 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Unlock the toolkit
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">No spam. We never share your email.</p>
    </form>
  );
}
