"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  subscribeToNewsletter,
  type NewsletterState,
} from "@/lib/actions/newsletter";

const initialState: NewsletterState = { success: false, message: "" };

export function NewsletterForm({ className }: { className?: string }) {
  const [state, formAction, pending] = useActionState(
    subscribeToNewsletter,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="hidden" aria-hidden>
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </div>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="bg-background"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Subscribe
        </Button>
      </div>
      {state.message && (
        <p
          role="status"
          className={`mt-2 text-sm ${state.success ? "text-success" : "text-destructive"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
