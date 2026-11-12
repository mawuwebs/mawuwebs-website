"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/form-fields";
import { StatusField } from "@/components/admin/status-field";
import { SubmitButton } from "@/components/admin/submit-button";
import type { FaqModel } from "@/generated/prisma/models";
import { createFaq, updateFaq, type FaqFormState } from "@/lib/actions/faqs";

const initialState: FaqFormState = { success: false, message: "" };

export function FaqForm({ faq }: { faq?: FaqModel }) {
  const action = faq ? updateFaq.bind(null, faq.id) : createFaq;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <Field label="Question" htmlFor="field-question" error={state.fieldErrors?.question}>
          <Input id="field-question" name="question" defaultValue={faq?.question} required />
        </Field>
        <Field label="Answer" htmlFor="field-answer" error={state.fieldErrors?.answer}>
          <Textarea id="field-answer" name="answer" rows={4} defaultValue={faq?.answer} required />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Category"
            htmlFor="field-category"
            hint="Groups FAQs on the public page, e.g. General, Pricing."
          >
            <Input
              id="field-category"
              name="category"
              defaultValue={faq?.category ?? "General"}
              required
            />
          </Field>
          <Field label="Order" htmlFor="field-order">
            <Input id="field-order" name="order" type="number" defaultValue={faq?.order ?? 0} />
          </Field>
        </div>
        <StatusField defaultValue={faq?.status ?? "DRAFT"} />
      </div>

      {state.message && !state.success && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{faq ? "Save changes" : "Add FAQ"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/faqs" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
