"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, SlugField, SeoFieldset } from "@/components/admin/form-fields";
import { StatusField } from "@/components/admin/status-field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SubmitButton } from "@/components/admin/submit-button";
import type { PageModel } from "@/generated/prisma/models";
import { createPage, updatePage, type PageFormState } from "@/lib/actions/pages";

const initialState: PageFormState = { success: false, message: "" };

export function PageForm({ page }: { page?: PageModel }) {
  const action = page ? updatePage.bind(null, page.id) : createPage;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="field-title" error={state.fieldErrors?.title}>
                <Input id="field-title" name="title" defaultValue={page?.title} required />
              </Field>
              <SlugField defaultTitle={page?.title} defaultSlug={page?.slug} />
            </div>

            <div className="mt-5">
              <RichTextEditor name="content" label="Content" defaultValue={page?.content} />
              {state.fieldErrors?.content && (
                <p className="mt-1.5 text-sm text-destructive">{state.fieldErrors.content}</p>
              )}
            </div>
          </div>

          <SeoFieldset
            defaultMetaTitle={page?.metaTitle}
            defaultMetaDescription={page?.metaDescription}
            defaultMetaKeywords={page?.metaKeywords}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <StatusField defaultValue={page?.status ?? "DRAFT"} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <ImageUploadField name="featuredImage" defaultValue={page?.featuredImage} />
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
        <SubmitButton>{page ? "Save changes" : "Create page"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/pages" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
