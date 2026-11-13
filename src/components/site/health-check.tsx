"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { submitHealthCheck, type HealthCheckState } from "@/lib/actions/health-check";
import type { Answer, Question } from "@/lib/health-check";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const initialState: HealthCheckState = { success: false, message: "" };
const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "No" },
];

const BAND_STYLE = {
  strong: "text-success",
  fair: "text-accent",
  exposed: "text-destructive",
  critical: "text-destructive",
} as const;

export function HealthCheck({ services, questions }: { services: Record<string, string>; questions: Question[] }) {
  const [state, formAction, pending] = useActionState(submitHealthCheck, initialState);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [step, setStep] = useState(0);
  const errors = state.fieldErrors ?? {};
  const total = questions.length;
  const done = step >= total;
  const q = questions[step];

  useEffect(() => {
    if (state.success && state.result) track("health_check", { band: state.result.band.id, percent: state.result.percent });
  }, [state.success, state.result]);

  function pick(value: Answer) {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    setStep((s) => s + 1);
  }

  if (state.success && state.result) {
    const r = state.result;
    return (
      <div className="mx-auto max-w-2xl" role="status">
        <p className="text-sm text-muted-foreground">Your IT health score</p>
        <p className={cn("mt-1 font-display text-6xl font-bold", BAND_STYLE[r.band.id])}>
          {r.percent}% <span className="text-3xl">{r.band.label}</span>
        </p>
        <p className="mt-3 text-muted-foreground">{r.band.summary}</p>

        <h2 className="mt-10 font-display text-xl font-semibold">By area</h2>
        <ul className="mt-4 space-y-3">
          {r.areas.map((a) => (
            <li key={a.area}>
              <div className="flex justify-between text-sm">
                <span>{a.area}</span>
                <span className="text-muted-foreground">{a.percent}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${a.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>

        {r.gaps.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-semibold">Gaps to close, worst first</h2>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {r.gaps.map((g) => (
                <li key={g.id} className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {g.area} · {g.severity === "no" ? "Missing" : "Partly in place"}
                  </p>
                  <p className="mt-1">{g.gap}</p>
                  {services[g.service] && (
                    <Link href={`/services/${g.service}`} className="mt-1 inline-block text-sm text-accent underline-offset-4 hover:underline">
                      How we help: {services[g.service]}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="font-display text-lg font-semibold">Want these gaps closed?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A copy is in your inbox. Book a free 30-minute call and we will walk through it and give you a fixed-price plan.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/book-a-call?topic=IT%20health%20check%20follow-up" className={buttonVariants()}>
              Book a free call
            </Link>
            <Link href="/plans" className={buttonVariants({ variant: "outline" })}>
              See managed plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!done) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {step + 1} of {total} · {q.area}
          </span>
          <span>{Math.round((step / total) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div className="h-full bg-accent transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>

        <fieldset className="mt-8">
          <legend className="font-display text-2xl font-semibold leading-snug">{q.text}</legend>
          {q.hint && <p className="mt-2 text-sm text-muted-foreground">{q.hint}</p>}
          <div className="mt-6 grid grid-cols-3 gap-3" role="radiogroup">
            {OPTIONS.map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  checked={answers[q.id] === o.value}
                  onChange={() => pick(o.value)}
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-border bg-card px-4 py-4 text-center font-medium transition-colors hover:border-foreground/30 peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  {o.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {step > 0 && (
          <Button type="button" variant="ghost" className="mt-6" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-5" noValidate>
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold">All done. Where should we send your result?</h2>
        <p className="mt-2 text-muted-foreground">You will see your score straight away, and get a copy by email.</p>
      </div>
      {state.message && !state.fieldErrors && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}
      {(
        [
          ["name", "Your name", "name", "text"],
          ["email", "Email", "email", "email"],
          ["company", "Company", "organization", "text"],
          ["phone", "Phone (optional)", "tel", "tel"],
        ] as const
      ).map(([id, label, auto, type]) => (
        <div key={id}>
          <Label htmlFor={id}>{label}</Label>
          <Input id={id} name={id} type={type} autoComplete={auto} aria-invalid={!!errors[id] || undefined} className="mt-1.5" />
          {errors[id] && (
            <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {errors[id]}
            </p>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={() => setStep(total - 1)}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Show my result
          {!pending && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
