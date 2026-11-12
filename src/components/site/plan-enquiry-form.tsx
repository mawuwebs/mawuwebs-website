"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, Clock, Loader2, Phone, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitPlanEnquiry, type PlanEnquiryState } from "@/lib/actions/plan-enquiry";
import { TEAM_SIZES, type Plan } from "@/lib/plans";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const initialState: PlanEnquiryState = { success: false, message: "" };

function Err({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

export function PlanEnquiry({ plans: PLANS, initialPlan, phone }: { plans: Plan[]; initialPlan?: string; phone: string }) {
  const [state, formAction, pending] = useActionState(submitPlanEnquiry, initialState);
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [selected, setSelected] = useState(initialPlan ?? PLANS.find((p) => p.highlight)?.slug ?? PLANS[0]?.slug ?? "");
  const plan = PLANS.find((p) => p.slug === selected) ?? PLANS[0];
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.fieldErrors) return;
    const first = Object.keys(state.fieldErrors)[0];
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  useEffect(() => {
    if (state.success) track("plan_enquiry", { plan: state.values?.plan ?? "" });
  }, [state.success, state.values?.plan]);

  if (state.success) {
    if (!plan) return <p className="text-center text-muted-foreground">No plans are available right now. Please call us.</p>;

  return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-display text-2xl font-bold">Enquiry received</h2>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <p className="mt-4 text-sm text-muted-foreground">A confirmation is on its way to your inbox.</p>
      </div>
    );
  }

  const formEl = (
    <form ref={formRef} action={formAction} className="space-y-6" noValidate>
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company_website">Company website</Label>
        <Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>
      
      <fieldset>
        <legend className="text-sm font-medium">Which plan?</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup">
          {PLANS.map((p) => (
            <label key={p.slug} className="cursor-pointer">
              <input
                type="radio"
                name="plan"
                value={p.name}
                checked={selected === p.slug}
                onChange={() => setSelected(p.slug)}
                className="peer sr-only"
              />
              <span className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                <span className="flex items-center justify-between gap-2 font-display font-semibold">
                  {p.name}
                  {p.highlight && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Popular</span>}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{p.tagline}</span>
              </span>
            </label>
          ))}
        </div>
        <Err text={errors.plan} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">How big is your team?</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
          {TEAM_SIZES.map((o) => (
            <label key={o} className="cursor-pointer">
              <input type="radio" name="teamSize" value={o} defaultChecked={v.teamSize === o} required className="peer sr-only" />
              <span
                className={cn(
                  "block rounded-full border bg-card px-4 py-2.5 text-sm transition-colors",
                  errors.teamSize ? "border-destructive/50" : "border-border",
                  "hover:border-foreground/30 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-medium",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                )}
              >
                {o}
              </span>
            </label>
          ))}
        </div>
        <Err text={errors.teamSize} />
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" defaultValue={v.company} aria-invalid={!!errors.company || undefined} required autoComplete="organization" className="mt-1.5" />
          <Err text={errors.company} />
        </div>
        <div>
          <Label htmlFor="devices">Computers / devices (optional)</Label>
          <Input id="devices" name="devices" defaultValue={v.devices} aria-invalid={!!errors.devices || undefined} placeholder="e.g. 12 laptops, 1 server" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" defaultValue={v.name} aria-invalid={!!errors.name || undefined} required autoComplete="name" className="mt-1.5" />
          <Err text={errors.name} />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" defaultValue={v.phone} aria-invalid={!!errors.phone || undefined} type="tel" required autoComplete="tel" className="mt-1.5" />
          <Err text={errors.phone} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" defaultValue={v.email} aria-invalid={!!errors.email || undefined} type="email" required autoComplete="email" className="mt-1.5" />
          <Err text={errors.email} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Anything we should know? (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={v.notes}
          rows={4}
          className="mt-1.5"
          placeholder="Current IT setup, past problems, what you want covered."
        />
      </div>

      {state.message && !state.success && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="h-12 px-8 text-base">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Request {plan.name} plan
      </Button>
    </form>
  );

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_0.9fr] lg:gap-16">
      <div className="order-2 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10 lg:order-1">
        <h2 className="font-display text-2xl font-bold">Tell us about your team</h2>
        <p className="mt-2 mb-8 text-muted-foreground">
          We&rsquo;ll review what you have today and reply with a written recommendation and cost.
        </p>
        {formEl}
      </div>
      <aside className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-secondary/50 p-6" aria-live="polite">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Selected plan</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{plan.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.forWho}</p>
          <p className="mt-3 text-sm font-medium">{plan.price ?? "Quoted to fit your team"}</p>
          <ul className="mt-5 space-y-3 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <Clock className="size-4 shrink-0 text-accent" />
            We reply within one business day
          </li>
          <li>
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-3 hover:text-accent">
              <Phone className="size-4 shrink-0 text-accent" />
              Prefer to talk? {phone}
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Not sure which fits?{" "}
          <Link href="/plans#compare" className="font-medium text-accent underline underline-offset-4">
            Compare plans
          </Link>
        </p>
      </aside>
    </div>
  );
}
