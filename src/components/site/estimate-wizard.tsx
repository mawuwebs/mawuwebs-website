"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PROJECT_TYPES,
  SIZES,
  FEATURES,
  TIMELINES,
  scoreEstimate,
  IT_TYPE,
  type Option,
} from "@/lib/estimate";
import { submitEstimate, type EstimateState } from "@/lib/actions/estimate";
import { track } from "@/lib/analytics";

const BRIEF_TYPE: Record<string, string> = {
  website: "New website",
  store: "Online store",
  webapp: "Web app or platform",
  mobile: "Mobile app",
  redesign: "Redesign of an existing site",
  it: "IT support or managed services",
  unsure: "Not sure yet",
};
const BRIEF_TIMELINE: Record<string, string> = {
  asap: "As soon as possible",
  soon: "Within 1 to 2 months",
  flex: "Flexible",
};

const initial: EstimateState = { success: false, message: "" };
const STEP_NAMES = ["Project", "Size", "Features", "Timeline", "Result"] as const;
const WEB_FLOW = [0, 1, 2, 3, 4];
const IT_FLOW = [0, 3, 4]; // IT services skip the pages-and-features questions

function Choice({
  option,
  selected,
  multi,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-accent bg-accent/5" : "border-border bg-card hover:border-foreground/30"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border",
          multi ? "rounded" : "rounded-full",
          selected ? "border-accent bg-accent text-accent-foreground" : "border-foreground/30"
        )}
      >
        {selected && <Check className="size-3.5" />}
      </span>
      <span>
        <span className="block font-medium">{option.label}</span>
        {option.hint && <span className="block text-sm text-muted-foreground">{option.hint}</span>}
      </span>
    </button>
  );
}

export function EstimateWizard() {
  const [step, setStep] = React.useState(0);
  const [type, setType] = React.useState<string>();
  const [size, setSize] = React.useState<string>();
  const [features, setFeatures] = React.useState<string[]>([]);
  const [timeline, setTimeline] = React.useState<string>();
  const [state, formAction, pending] = useActionState(submitEstimate, initial);

  const flow = type === IT_TYPE ? IT_FLOW : WEB_FLOW;
  const pos = flow.indexOf(step);
  const canNext = [type, size, true, timeline][step];
  const { tier } = scoreEstimate({ type, size, features });

  React.useEffect(() => {
    if (state.success) track("estimate_submitted", { tier: tier.name });
  }, [state.success, tier.name]);

  function next() {
    setStep(flow[pos + 1]);
    if (step === 3) track("estimate_completed", { tier: tier.name });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-10 flex items-center gap-2" aria-label="Progress">
        {flow.map((stepIndex, i) => (
          <li key={stepIndex} className="flex-1">
            <div className={cn("h-1 rounded-full", i <= pos ? "bg-accent" : "bg-border")} />
            <span
              className={cn(
                "mt-2 hidden text-xs sm:block",
                i === pos ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {STEP_NAMES[stepIndex]}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset className="space-y-3" role="radiogroup">
          <legend className="mb-5 font-display text-2xl font-semibold">What are you building?</legend>
          {PROJECT_TYPES.map((o) => (
            <Choice key={o.id} option={o} selected={type === o.id} onSelect={() => setType(o.id)} />
          ))}
        </fieldset>
      )}
      {step === 1 && (
        <fieldset className="space-y-3" role="radiogroup">
          <legend className="mb-5 font-display text-2xl font-semibold">How big is it?</legend>
          {SIZES.map((o) => (
            <Choice key={o.id} option={o} selected={size === o.id} onSelect={() => setSize(o.id)} />
          ))}
        </fieldset>
      )}
      {step === 2 && (
        <fieldset className="space-y-3">
          <legend className="mb-5 font-display text-2xl font-semibold">
            Anything special it needs to do?
          </legend>
          <p className="-mt-3 mb-2 text-sm text-muted-foreground">Pick any that apply, or none.</p>
          {FEATURES.map((o) => (
            <Choice
              key={o.id}
              option={o}
              multi
              selected={features.includes(o.id)}
              onSelect={() =>
                setFeatures((f) => (f.includes(o.id) ? f.filter((x) => x !== o.id) : [...f, o.id]))
              }
            />
          ))}
        </fieldset>
      )}
      {step === 3 && (
        <fieldset className="space-y-3" role="radiogroup">
          <legend className="mb-5 font-display text-2xl font-semibold">When do you need it?</legend>
          {TIMELINES.map((o) => (
            <Choice key={o.id} option={o} selected={timeline === o.id} onSelect={() => setTimeline(o.id)} />
          ))}
        </fieldset>
      )}

      {step === 4 && (
        <div>
          <div className="rounded-2xl bg-forest p-8 text-white">
            <p className="text-sm text-white/70">{type === IT_TYPE ? "Based on your answers, this is" : "Based on your answers, this looks like a"}</p>
            <p className="mt-2 font-display text-4xl font-semibold text-yellow">{tier.name}</p>
            <p className="mt-4 text-white/80">{tier.summary}</p>
            {type !== IT_TYPE && (
              <p className="mt-5 text-sm text-white/70">
                Typical build time: <span className="font-medium text-white">{tier.weeks}</span>
              </p>
            )}
            <Link
              href={`/start-a-project?${new URLSearchParams({
                from: tier.name,
                ...(BRIEF_TYPE[type ?? ""] ? { type: BRIEF_TYPE[type ?? ""] } : {}),
                ...(BRIEF_TIMELINE[timeline ?? ""] ? { timeline: BRIEF_TIMELINE[timeline ?? ""] } : {}),
              }).toString()}`}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-forest hover:bg-orange-dark"
            >
              Turn this into a project brief <ArrowRight className="size-4" />
            </Link>
            <p className="mt-5 border-t border-white/15 pt-4 text-xs text-white/60">
              {type === IT_TYPE ? "Tell us a little about your setup and we'll suggest the quickest way to scope it." : "This is a rough guide, not a quote. Price depends on details we'd confirm with you."}
            </p>
          </div>

          {state.success ? (
            <p role="status" className="mt-8 rounded-xl border border-success/40 bg-success/10 p-5 text-success">
              {state.message}
            </p>
          ) : (
            <form action={formAction} className="mt-8 space-y-4">
              <h2 className="font-display text-xl font-semibold">Want a written quote?</h2>
              <input type="hidden" name="type" value={type} />
              {size && <input type="hidden" name="size" value={size} />}
              <input type="hidden" name="timeline" value={timeline} />
              {features.map((f) => (
                <input key={f} type="hidden" name="features" value={f} />
              ))}
              <div className="hidden" aria-hidden>
                <input name="company_website" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="est-name" className="text-sm font-medium">Name</label>
                  <Input id="est-name" name="name" required className="mt-1.5" />
                  {state.fieldErrors?.name && <p className="mt-1 text-sm text-destructive">{state.fieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="est-email" className="text-sm font-medium">Email</label>
                  <Input id="est-email" name="email" type="email" required className="mt-1.5" />
                  {state.fieldErrors?.email && <p className="mt-1 text-sm text-destructive">{state.fieldErrors.email}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="est-notes" className="text-sm font-medium">
                  Anything else we should know? <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea id="est-notes" name="notes" rows={3} className="mt-1.5" />
              </div>
              {state.message && !state.success && (
                <p role="alert" className="text-sm text-destructive">{state.message}</p>
              )}
              <Button type="submit" size="lg" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Send my answers
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(flow[Math.max(pos - 1, 0)])}
          className={cn(step === 0 && "invisible")}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < 4 && (
          <Button type="button" size="lg" onClick={next} disabled={!canNext}>
            {step === 3 ? "See result" : "Next"} <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
