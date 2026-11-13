"use client";

import { UnsavedGuard } from "@/components/admin/unsaved-guard";
import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, SlugField, SeoFieldset } from "@/components/admin/form-fields";
import { ScheduleField } from "@/components/admin/schedule-field";
import { StatusField, SwitchField } from "@/components/admin/status-field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { GalleryField } from "@/components/admin/gallery-field";
import { CategorySelect } from "@/components/admin/category-select";
import { TagPicker } from "@/components/admin/tag-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { MetricsField } from "@/components/admin/metrics-field";
import { SubmitButton } from "@/components/admin/submit-button";
import type { ProjectModel, CategoryModel, TagModel } from "@/generated/prisma/models";
import {
  createProject,
  updateProject,
  type ProjectFormState,
} from "@/lib/actions/projects";

const initialState: ProjectFormState = { success: false, message: "" };

export function ProjectForm({
  project,
  categories,
  tags,
}: {
  project?: ProjectModel & { tags?: TagModel[] };
  categories: CategoryModel[];
  tags: TagModel[];
}) {
  const action = project ? updateProject.bind(null, project.id) : createProject;
  const [state, formAction] = useActionState(action, initialState);

  let results: { label: string; value: string }[] = [];
  try {
    results = project?.results ? JSON.parse(project.results) : [];
  } catch {
    results = [];
  }

  let gallery: string[] = [];
  try {
    gallery = project?.gallery ? JSON.parse(project.gallery) : [];
  } catch {
    gallery = [];
  }

  return (
    <form action={formAction} className="space-y-6">
      <UnsavedGuard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="field-title" error={state.fieldErrors?.title}>
                <Input id="field-title" name="title" defaultValue={project?.title} required />
              </Field>
              <SlugField defaultTitle={project?.title} defaultSlug={project?.slug} />
            </div>

            <Field
              label="Short description"
              htmlFor="field-description"
              error={state.fieldErrors?.description}
              className="mt-5"
            >
              <Textarea
                id="field-description"
                name="description"
                rows={2}
                defaultValue={project?.description}
                required
              />
            </Field>

            <div className="mt-5">
              <RichTextEditor name="content" label="Full content" defaultValue={project?.content} />
              {state.fieldErrors?.content && (
                <p className="mt-1.5 text-sm text-destructive">{state.fieldErrors.content}</p>
              )}
            </div>

            <div className="mt-5">
              <GalleryField defaultValue={gallery} />
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <h3 className="font-display text-base font-semibold">Case study</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. When filled in, the project page shows the story: problem, approach, and measurable result.
              </p>
            </div>
            <Field label="The challenge" htmlFor="field-challenge">
              <Textarea id="field-challenge" name="challenge" rows={4} defaultValue={project?.challenge ?? ""} />
            </Field>
            <Field label="What we did" htmlFor="field-solution">
              <Textarea id="field-solution" name="solution" rows={4} defaultValue={project?.solution ?? ""} />
            </Field>
            <MetricsField
              defaultValue={results}
              fieldPrefix="result"
              label="Results"
              hint="Only real, measurable outcomes, e.g. “−38%” / “Page load time”."
              placeholderValue="−38%"
              placeholderLabel="Page load time"
            />
          </div>

          <SeoFieldset
            pathPrefix="/portfolio/"
            defaultNoIndex={project?.noIndex}
            defaultMetaTitle={project?.metaTitle}
            defaultMetaDescription={project?.metaDescription}
            defaultMetaKeywords={project?.metaKeywords}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <StatusField defaultValue={project?.status ?? "DRAFT"} />
            <ScheduleField defaultValue={project?.scheduledAt} error={state.fieldErrors?.scheduledAt} />
            <SwitchField
              name="featured"
              label="Featured"
              description="Show on homepage"
              defaultChecked={project?.featured ?? false}
            />
            <Field label="Order" htmlFor="field-order" hint="Lower numbers appear first.">
              <Input id="field-order" name="order" type="number" defaultValue={project?.order ?? 0} />
            </Field>
            <CategorySelect categories={categories} defaultValue={project?.categoryId} />
            <TagPicker tags={tags} defaultSelected={project?.tags?.map((t) => t.id) ?? []} />
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <Field label="Client" htmlFor="field-client">
              <Input id="field-client" name="client" defaultValue={project?.client ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year" htmlFor="field-year">
                <Input id="field-year" name="year" defaultValue={project?.year ?? ""} placeholder="2026" />
              </Field>
              <Field label="Our role" htmlFor="field-role">
                <Input id="field-role" name="role" defaultValue={project?.role ?? ""} placeholder="Design & build" />
              </Field>
            </div>
            <Field label="Live project URL" htmlFor="field-projectUrl">
              <Input
                id="field-projectUrl"
                name="projectUrl"
                type="url"
                defaultValue={project?.projectUrl ?? ""}
                placeholder="https://"
              />
            </Field>
            <ImageUploadField name="featuredImage" defaultValue={project?.featuredImage} />
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
        <SubmitButton>{project ? "Save changes" : "Create project"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/projects" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
