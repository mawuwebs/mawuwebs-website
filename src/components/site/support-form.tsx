"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitSupportRequest, type SupportState } from "@/lib/actions/support";
import type { SupportConfig } from "@/lib/support";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const initialState: SupportState = { success: false, message: "" };

function Err({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

function Pills({ name, options, error }: { name: string; options: readonly string[]; error?: string }) {
  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="radio" name={name} value={o} required className="peer sr-only" />
            <span
              className={cn(
                "block rounded-full border bg-card px-4 py-2 text-sm transition-colors",
                error ? "border-destructive/50" : "border-border",
                "hover:border-foreground/30 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-medium",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              )}
            >
              {o}
            </span>
          </label>
        ))}
      </div>
      <Err text={error} />
    </div>
  );
}

export function SupportForm({ config }: { config: SupportConfig }) {
  const [state, formAction, pending] = useActionState(submitSupportRequest, initialState);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) track("support_requested");
  }, [state.success]);

  if (state.success) {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-display text-2xl font-bold">Request received</h2>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Work stopped completely? Please also call us so we can start straight away.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend className="font-display text-lg font-semibold">What is the problem about?</legend>
        <Pills name="issue" options={config.issues} error={errors.issue} />
      </fieldset>

      <fieldset>
        <legend className="font-display text-lg font-semibold">How urgent is it?</legend>
        <Pills name="urgency" options={config.urgency.map((u) => u.label)} error={errors.urgency} />
      </fieldset>

      <div>
        <Label htmlFor="description">What is happening?</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={5}
          className="mt-1.5"
          placeholder="e.g. Three computers in the office can't connect to the internet since this morning."
        />
        <Err text={errors.description} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required autoComplete="name" className="mt-1.5" />
          <Err text={errors.name} />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" required autoComplete="tel" className="mt-1.5" />
          <Err text={errors.phone} />
        </div>
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" />
          <Err text={errors.email} />
        </div>
        <div>
          <Label htmlFor="company">Company (optional)</Label>
          <Input id="company" name="company" autoComplete="organization" className="mt-1.5" />
        </div>
      </div>

      {state.message && !state.success && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="h-12 px-8 text-base">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send support request
      </Button>
    </form>
  );
}
