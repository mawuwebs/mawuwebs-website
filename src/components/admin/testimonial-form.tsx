"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/form-fields";
import { StatusField } from "@/components/admin/status-field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SubmitButton } from "@/components/admin/submit-button";
import type { TestimonialModel } from "@/generated/prisma/models";
import {
  createTestimonial,
  updateTestimonial,
  type TestimonialFormState,
} from "@/lib/actions/testimonials";

const initialState: TestimonialFormState = { success: false, message: "" };

export function TestimonialForm({ testimonial }: { testimonial?: TestimonialModel }) {
  const action = testimonial
    ? updateTestimonial.bind(null, testimonial.id)
    : createTestimonial;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Name" htmlFor="field-name" error={state.fieldErrors?.name}>
              <Input id="field-name" name="name" defaultValue={testimonial?.name} required />
            </Field>
            <Field label="Role" htmlFor="field-role">
              <Input id="field-role" name="role" defaultValue={testimonial?.role ?? ""} />
            </Field>
            <Field label="Company" htmlFor="field-company">
              <Input id="field-company" name="company" defaultValue={testimonial?.company ?? ""} />
            </Field>
          </div>

          <Field label="Testimonial" htmlFor="field-content" error={state.fieldErrors?.content}>
            <Textarea
              id="field-content"
              name="content"
              rows={5}
              defaultValue={testimonial?.content}
              required
            />
          </Field>

          <Field label="Rating (1–5)" htmlFor="field-rating">
            <Input
              id="field-rating"
              name="rating"
              type="number"
              min={1}
              max={5}
              defaultValue={testimonial?.rating ?? 5}
            />
          </Field>
        </div>

        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <StatusField defaultValue={testimonial?.status ?? "DRAFT"} />
            <Field label="Order" htmlFor="field-order" hint="Lower numbers appear first.">
              <Input id="field-order" name="order" type="number" defaultValue={testimonial?.order ?? 0} />
            </Field>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <ImageUploadField label="Avatar" name="avatar" defaultValue={testimonial?.avatar} />
          </div>
        </div>
      </div>

      {state.message && !state.success && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <SubmitButton>{testimonial ? "Save changes" : "Add testimonial"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/testimonials" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
