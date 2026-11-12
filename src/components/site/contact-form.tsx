"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Send, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitContactForm, type ContactState } from "@/lib/actions/contact";

const initialState: ContactState = { success: false, message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div role="status" className="animate-in fade-in zoom-in-95 flex flex-col items-center rounded-2xl border border-success/30 bg-success/5 p-10 text-center">
        <CheckCircle2 className="animate-in zoom-in-50 spin-in-[-30deg] fill-mode-both size-12 text-success delay-150 duration-700" />
        <h3 className="mt-4 font-display text-xl font-semibold">Message sent!</h3>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      {/* Honeypot field, hidden from real users */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required className="mt-1.5" placeholder="Jane Doe" />
          {errors.name && <p role="alert" className="animate-in fade-in slide-in-from-top-1 mt-1.5 text-sm text-destructive duration-300">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1.5"
            placeholder="jane@company.com"
          />
          {errors.email && <p role="alert" className="animate-in fade-in slide-in-from-top-1 mt-1.5 text-sm text-destructive duration-300">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" className="mt-1.5" placeholder="+1 (555) 000-0000" />
        </div>
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" className="mt-1.5" placeholder="New project inquiry" />
        </div>
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          className="mt-1.5"
          placeholder="Tell us a bit about your project..."
        />
        {errors.message && <p role="alert" className="animate-in fade-in slide-in-from-top-1 mt-1.5 text-sm text-destructive duration-300">{errors.message}</p>}
      </div>

      {!state.success && state.message && (
        <p role="alert" className="animate-shake flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="sheen-host w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send message
      </Button>
    </form>
  );
}
