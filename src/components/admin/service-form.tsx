"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, SlugField, SeoFieldset } from "@/components/admin/form-fields";
import { StatusField, SwitchField } from "@/components/admin/status-field";
import { IconPicker } from "@/components/admin/icon-picker";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SubmitButton } from "@/components/admin/submit-button";
import type { ServiceModel } from "@/generated/prisma/models";
import {
  createService,
  updateService,
  type ServiceFormState,
} from "@/lib/actions/services";

const initialState: ServiceFormState = { success: false, message: "" };

export function ServiceForm({ service }: { service?: ServiceModel }) {
  const action = service ? updateService.bind(null, service.id) : createService;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="field-title" error={state.fieldErrors?.title}>
                <Input id="field-title" name="title" defaultValue={service?.title} required />
              </Field>
              <SlugField defaultTitle={service?.title} defaultSlug={service?.slug} />
            </div>

            <Field
              label="Short description"
              htmlFor="field-description"
              error={state.fieldErrors?.description}
              className="mt-5"
              hint="Shown on service cards and listings."
            >
              <Textarea
                id="field-description"
                name="description"
                rows={2}
                defaultValue={service?.description}
                required
              />
            </Field>

            <div className="mt-5">
              <RichTextEditor name="content" label="Full content" defaultValue={service?.content} />
              {state.fieldErrors?.content && (
                <p className="mt-1.5 text-sm text-destructive">{state.fieldErrors.content}</p>
              )}
            </div>
          </div>

          <SeoFieldset
            defaultMetaTitle={service?.metaTitle}
            defaultMetaDescription={service?.metaDescription}
            defaultMetaKeywords={service?.metaKeywords}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <StatusField defaultValue={service?.status ?? "DRAFT"} />
            <SwitchField
              name="featured"
              label="Featured"
              description="Show on homepage"
              defaultChecked={service?.featured ?? false}
            />
            <Field label="Order" htmlFor="field-order" hint="Lower numbers appear first.">
              <Input
                id="field-order"
                name="order"
                type="number"
                defaultValue={service?.order ?? 0}
              />
            </Field>
            <IconPicker defaultValue={service?.icon ?? "Sparkles"} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <ImageUploadField name="featuredImage" defaultValue={service?.featuredImage} />
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
        <SubmitButton>{service ? "Save changes" : "Create service"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/services" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
