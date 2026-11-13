"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitBooking, type BookingState } from "@/lib/actions/booking";
import { TOPICS, DAYS, WINDOWS, MODES } from "@/lib/booking";
import { track } from "@/lib/analytics";

const initialState: BookingState = { success: false, message: "" };

function Err({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

function Pills({ name, options, type, defaultValue, error }: { name: string; options: readonly string[]; type: "radio" | "checkbox"; defaultValue?: string; error?: string }) {
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2" role={type === "radio" ? "radiogroup" : "group"}>
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type={type} name={name} value={o} defaultChecked={defaultValue === o} className="peer sr-only" />
            <span className="block rounded-full border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-foreground/30 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              {o}
            </span>
          </label>
        ))}
      </div>
      <Err text={error} />
    </>
  );
}

export function BookingForm({ defaultTopic }: { defaultTopic?: string }) {
  const [state, formAction, pending] = useActionState(async (p: BookingState, f: FormData) => {
    const res = await submitBooking(p, f);
    if (res.success) track("call_booking");
    return res;
  }, initialState);
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.success) {
    return (
      <div role="status" className="mx-auto max-w-xl rounded-2xl border border-success/30 bg-success/5 p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-display text-2xl font-bold">Request received</h2>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-6" noValidate>
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">What is it about?</legend>
        <Pills name="topic" type="radio" options={TOPICS} defaultValue={v.topic || defaultTopic} error={errors.topic} />
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">How should we talk?</legend>
        <Pills name="mode" type="radio" options={MODES} defaultValue={v.mode} error={errors.mode} />
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Days that suit you (pick any)</legend>
        <Pills name="days" type="checkbox" options={DAYS} error={errors.days} />
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Time of day</legend>
        <Pills name="window" type="radio" options={WINDOWS} defaultValue={v.window} error={errors.window} />
      </fieldset>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {(
          [
            ["name", "Your name", "name", "text"],
            ["email", "Email", "email", "email"],
            ["phone", "Phone / WhatsApp", "tel", "tel"],
            ["company", "Company (optional)", "organization", "text"],
          ] as const
        ).map(([id, label, auto, type]) => (
          <div key={id}>
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} type={type} autoComplete={auto} defaultValue={v[id]} aria-invalid={!!errors[id] || undefined} className="mt-1.5" />
            <Err text={errors[id]} />
          </div>
        ))}
      </div>
      <div>
        <Label htmlFor="notes">Anything we should know? (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={v.notes} className="mt-1.5" />
      </div>
      {state.message && !state.fieldErrors && (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      )}
      <Button type="submit" disabled={pending} size="lg">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Request a free 30-minute call
      </Button>
    </form>
  );
}
