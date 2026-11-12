"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, SlugField } from "@/components/admin/form-fields";
import { ScheduleField } from "@/components/admin/schedule-field";
import { StatusField, SwitchField } from "@/components/admin/status-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { UnsavedGuard } from "@/components/admin/unsaved-guard";
import { createPlan, updatePlan, type PlanFormState } from "@/lib/actions/plans";
import { toPlan } from "@/lib/plans";
import type { PlanModel } from "@/generated/prisma/models";

const initialState: PlanFormState = { success: false, message: "" };

export function PlanForm({ plan }: { plan?: PlanModel }) {
  const action = plan ? updatePlan.bind(null, plan.id) : createPlan;
  const [state, formAction] = useActionState(action, initialState);
  const features = plan ? toPlan(plan).features.join("\n") : "";

  return (
    <form action={formAction} className="space-y-6">
      <UnsavedGuard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Plan name" htmlFor="field-name" error={state.fieldErrors?.name}>
              <Input id="field-name" name="name" defaultValue={plan?.name} required />
            </Field>
            <SlugField titleInputName="name" defaultTitle={plan?.name} defaultSlug={plan?.slug} />
          </div>
          <Field label="Tagline" htmlFor="field-tagline" error={state.fieldErrors?.tagline} hint="One short line under the plan name.">
            <Input id="field-tagline" name="tagline" defaultValue={plan?.tagline} />
          </Field>
          <Field label="Who it's for" htmlFor="field-forWho" error={state.fieldErrors?.forWho}>
            <Textarea id="field-forWho" name="forWho" rows={2} defaultValue={plan?.forWho} />
          </Field>
          <Field
            label="What's included"
            htmlFor="field-features"
            error={state.fieldErrors?.features}
            hint='One feature per line. Start a line with "Everything in <plan>" to roll up the plan before it in the comparison table.'
          >
            <Textarea id="field-features" name="features" rows={9} defaultValue={features} required />
          </Field>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 self-start">
          <StatusField defaultValue={plan?.status ?? "DRAFT"} />
          <ScheduleField defaultValue={plan?.scheduledAt} error={state.fieldErrors?.scheduledAt} />
          <SwitchField
            name="highlight"
            label="Most popular"
            description="Ribbon and larger card. Only one plan can have it."
            defaultChecked={plan?.highlight ?? false}
          />
          <Field label="Price (optional)" htmlFor="field-price" hint='Shown on the card, e.g. "From GHS 500 / month". Leave empty to hide.'>
            <Input id="field-price" name="price" defaultValue={plan?.price ?? ""} />
          </Field>
          <Field label="Order" htmlFor="field-order" hint="Lower numbers appear first.">
            <Input id="field-order" name="order" type="number" min={0} defaultValue={plan?.order ?? 0} />
          </Field>
        </div>
      </div>

      {state.message && !state.success && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <SubmitButton>{plan ? "Save changes" : "Create plan"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/plans" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
