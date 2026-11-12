"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Globe,
  HardDrive,
  Headset,
  Laptop,
  LayoutDashboard,
  Loader2,
  Network,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitProjectBrief, type BriefState } from "@/lib/actions/project-brief";
import { BRIEF_TYPE_GROUPS, BRIEF_TIMELINES, TYPE_HINTS, TIMELINE_HINTS } from "@/lib/brief";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const BRIEF_DRAFT_KEY = "mw-brief-draft";

const initialState: BriefState = { success: false, message: "" };

type Values = {
  type: string;
  timeline: string;
  description: string;
  budget: string;
  link: string;
  name: string;
  email: string;
  company: string;
};

const EMPTY: Values = {
  type: "",
  timeline: "",
  description: "",
  budget: "",
  link: "",
  name: "",
  email: "",
  company: "",
};

const STEPS = ["Need", "Timing", "Details", "You"] as const;
const LAST = STEPS.length - 1;

const TYPE_ICONS: Record<string, LucideIcon> = {
  "New website": Globe,
  "Online store": ShoppingCart,
  "Web app or platform": LayoutDashboard,
  "Mobile app": Smartphone,
  "Redesign of an existing site": RefreshCw,
  "IT support or managed services": Headset,
  "Networking & Wi-Fi": Network,
  Cybersecurity: ShieldCheck,
  "Hardware & equipment": Laptop,
  "Backup & recovery": HardDrive,
  "IT consulting or training": Briefcase,
  "Not sure yet": Sparkles,
};

const PROMPTS = [
  "Who is it for?",
  "What should visitors be able to do?",
  "Any sites you like?",
  "Is there a hard deadline?",
];

// Mirrors the server rules so problems show up before the request is sent.
function validateStep(step: number, v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0 && !v.type) e.type = "Pick the option that fits best. You can change it later.";
  if (step === 1 && !v.timeline) e.timeline = "Pick a timeline, even a rough one.";
  if (step === 2 && v.description.trim().length < 20)
    e.description = "Give us a few sentences (at least 20 characters).";
  if (step === 3) {
    if (v.name.trim().length < 2) e.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  }
  return e;
}

function Err({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} role="alert" className="animate-in fade-in slide-in-from-top-1 mt-2 flex items-start gap-1.5 text-sm text-destructive duration-300">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

function ChoiceCard({
  label,
  hint,
  icon: Icon,
  selected,
  onSelect,
  first,
}: {
  label: string;
  hint: string;
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-first={first ? "" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-accent bg-accent/5 shadow-sm"
          : "border-border bg-card hover:-translate-y-0.5 hover:border-foreground/30"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-accent bg-accent" : "border-foreground/30"
        )}
      >
        {selected && <span className="size-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export function ProjectBriefForm({
  defaultType,
  defaultTimeline,
  fromEstimate,
}: {
  defaultType?: string;
  defaultTimeline?: string;
  fromEstimate?: string;
}) {
  const [state, formAction, pending] = useActionState(submitProjectBrief, initialState);
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<Values>({
    ...EMPTY,
    type: defaultType ?? "",
    timeline: defaultTimeline ?? "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [restored, setRestored] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const started = React.useRef(false);
  const mounted = React.useRef(false);

  // Restore a saved draft after hydration. Storage is read synchronously (before the save effect
  // below can overwrite it); only the state update is deferred so the first render matches the server.
  React.useEffect(() => {
    let saved: { values?: Partial<Values>; step?: number } | null = null;
    try {
      const raw = sessionStorage.getItem(BRIEF_DRAFT_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    if (!saved?.values) return;
    const draft = saved;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled || !draft.values) return;
      setValues((cur) => ({
        ...EMPTY,
        ...draft.values,
        type: defaultType ?? draft.values?.type ?? cur.type,
        timeline: defaultTimeline ?? draft.values?.timeline ?? cur.timeline,
      }));
      const hasContent = Object.values(draft.values).some(Boolean);
      if (hasContent && typeof draft.step === "number") setStep(Math.min(draft.step, LAST));
      if (hasContent) setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [defaultType, defaultTimeline]);

  // Save the draft as people go.
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    try {
      sessionStorage.setItem(BRIEF_DRAFT_KEY, JSON.stringify({ values, step }));
    } catch {
      /* ignore */
    }
  }, [values, step]);

  // Move focus to the step heading when the step changes (keyboard and screen reader friendly).
  React.useEffect(() => {
    if (mounted.current && step > 0) headingRef.current?.focus();
    if (step > 0) track(`brief_step_${step + 1}`);
  }, [step]);

  function set<K extends keyof Values>(key: K, value: string) {
    if (!started.current) {
      started.current = true;
      track("brief_started");
    }
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _drop, ...rest } = e;
      void _drop;
      return rest;
    });
  }

  function goNext() {
    const e = validateStep(step, values);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      requestAnimationFrame(() => {
        const el =
          document.getElementById(first) ??
          document.querySelector<HTMLElement>("[role=radio][data-first]");
        el?.focus();
      });
      return;
    }
    setStep((s) => Math.min(s + 1, LAST));
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function jump(to: number) {
    setErrors({});
    setStep(to);
  }

  // Enter moves forward on earlier steps instead of submitting half a form.
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || step === LAST) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    e.preventDefault();
    goNext();
  }

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <form
      action={formAction}
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        if (step !== LAST) {
          e.preventDefault();
          return;
        }
        const err = validateStep(LAST, values);
        if (Object.keys(err).length) {
          e.preventDefault();
          setErrors(err);
          document.getElementById(Object.keys(err)[0])?.focus();
        }
      }}
      noValidate
    >
      {/* Every answer is posted, even from steps that are no longer on screen. */}
      {(Object.keys(values) as (keyof Values)[]).map((k) => (
        <input key={k} type="hidden" name={k} value={values[k]} />
      ))}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium">
            Step {step + 1} of {STEPS.length}
            <span className="text-muted-foreground"> · {STEPS[step]}</span>
          </p>
          <p className="text-muted-foreground">About 3 minutes</p>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Form progress"
        >
          <div className="h-full rounded-full bg-accent transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-3 hidden grid-cols-4 gap-2 text-xs sm:grid">
          {STEPS.map((s, i) => (
            <li key={s}>
              {i < step ? (
                <button type="button" onClick={() => jump(i)} className="text-accent underline-offset-4 hover:underline">
                  {s}
                </button>
              ) : (
                <span className={cn(i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{s}</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {restored && step === 0 && (
        <p className="mb-6 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          We saved your earlier answers.{" "}
          <button
            type="button"
            className="font-medium text-accent underline underline-offset-4"
            onClick={() => {
              setValues({ ...EMPTY, type: defaultType ?? "", timeline: defaultTimeline ?? "" });
              setRestored(false);
              try {
                sessionStorage.removeItem(BRIEF_DRAFT_KEY);
              } catch {
                /* ignore */
              }
            }}
          >
            Start over
          </button>
        </p>
      )}
      {fromEstimate && step === 0 && (
        <p className="mb-6 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Your estimate result ({fromEstimate}) is carried over. Check it and carry on.
        </p>
      )}

      <div key={step} className="animate-in fade-in slide-in-from-right-3 duration-300">
        {step === 0 && (
          <fieldset>
            <legend className="sr-only">What do you need?</legend>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none">
              What do you need?
            </h2>
            <p className="mt-1 text-muted-foreground">Websites, software, IT support, networks, security, hardware: choose the closest fit.</p>
            <div className="mt-6 space-y-7" role="radiogroup" aria-label="What you need">
              {BRIEF_TYPE_GROUPS.map((group, gi) => (
                <div key={group.label}>
                  <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {group.types.map((t, i) => (
                      <ChoiceCard
                        key={t}
                        label={t}
                        hint={TYPE_HINTS[t]}
                        icon={TYPE_ICONS[t]}
                        selected={values.type === t}
                        first={gi === 0 && i === 0}
                        onSelect={() => set("type", t)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Err id="type" text={errors.type} />
          </fieldset>
        )}

        {step === 1 && (
          <fieldset>
            <legend className="sr-only">When do you need it?</legend>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none">
              When do you need it?
            </h2>
            <p className="mt-1 text-muted-foreground">A rough idea is fine.</p>
            <div className="mt-6 grid grid-cols-1 gap-3" role="radiogroup" aria-label="Timeline">
              {BRIEF_TIMELINES.map((t, i) => (
                <ChoiceCard
                  key={t}
                  label={t}
                  hint={TIMELINE_HINTS[t]}
                  selected={values.timeline === t}
                  first={i === 0}
                  onSelect={() => set("timeline", t)}
                />
              ))}
            </div>
            <Err id="timeline" text={errors.timeline} />
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-6">
            <legend className="sr-only">About the project</legend>
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none">
                Tell us about it
              </h2>
              <p className="mt-1 text-muted-foreground">Plain words are fine. No jargon needed.</p>
            </div>
            <div>
              <Label htmlFor="description">What are you trying to achieve?</Label>
              <Textarea
                id="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                onBlur={() => {
                  const e = validateStep(2, values);
                  if (values.description && e.description) setErrors(e);
                }}
                rows={6}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : "description-hint"}
                className="mt-1.5"
                placeholder="e.g. We're a clinic and want patients to book online instead of phoning us."
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p id="description-hint" className="text-xs text-muted-foreground">
                  Helpful to mention: {PROMPTS.join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {values.description.trim().length}/20 minimum
                </p>
              </div>
              <Err id="description-error" text={errors.description} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  value={values.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  className="mt-1.5"
                  placeholder="A figure or range, if you have one"
                />
              </div>
              <div>
                <Label htmlFor="link">Current site or inspiration (optional)</Label>
                <Input
                  id="link"
                  value={values.link}
                  onChange={(e) => set("link", e.target.value)}
                  className="mt-1.5"
                  placeholder="https://"
                />
              </div>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Your details</legend>
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none">
                How do we reach you?
              </h2>
              <p className="mt-1 text-muted-foreground">We only use this to reply about your project.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className="mt-1.5"
                />
                <Err id="name-error" text={errors.name} />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => {
                    if (values.email && validateStep(3, values).email) setErrors((x) => ({ ...x, email: validateStep(3, values).email }));
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="mt-1.5"
                />
                <Err id="email-error" text={errors.email} />
              </div>
            </div>
            <div>
              <Label htmlFor="company">Company or organisation (optional)</Label>
              <Input
                id="company"
                value={values.company}
                onChange={(e) => set("company", e.target.value)}
                autoComplete="organization"
                className="mt-1.5"
              />
            </div>

            <div className="rounded-xl border border-border bg-secondary/50 p-5">
              <p className="text-sm font-medium">Your brief</p>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Need", values.type, 0],
                  ["Timing", values.timeline, 1],
                  ["Details", values.description.length > 90 ? `${values.description.slice(0, 90)}…` : values.description, 2],
                ].map(([label, value, to]) => (
                  <div key={label as string} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words">{value || "—"}</dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => jump(to as number)}
                      className="inline-flex shrink-0 items-center gap-1 text-accent underline-offset-4 hover:underline"
                      aria-label={`Edit ${String(label).toLowerCase()}`}
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                  </div>
                ))}
              </dl>
            </div>
          </fieldset>
        )}
      </div>

      {state.message && !state.success && step === LAST && (
        <p role="alert" className="animate-shake mt-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={goBack} className={cn(step === 0 && "invisible")}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < LAST ? (
          <Button type="button" size="lg" onClick={goNext} className="h-12 px-8 text-base">
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={pending} className="sheen-host h-12 px-8 text-base">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send my project brief
          </Button>
        )}
      </div>
    </form>
  );
}
