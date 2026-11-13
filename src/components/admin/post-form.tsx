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
import { CategorySelect } from "@/components/admin/category-select";
import { TagPicker } from "@/components/admin/tag-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SubmitButton } from "@/components/admin/submit-button";
import type { PostModel, CategoryModel, TagModel } from "@/generated/prisma/models";
import { createPost, updatePost, type PostFormState } from "@/lib/actions/posts";

const initialState: PostFormState = { success: false, message: "" };

export function PostForm({
  post,
  categories,
  tags,
}: {
  post?: PostModel & { tags?: TagModel[] };
  categories: CategoryModel[];
  tags: TagModel[];
}) {
  const action = post ? updatePost.bind(null, post.id) : createPost;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <UnsavedGuard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="field-title" error={state.fieldErrors?.title}>
                <Input id="field-title" name="title" defaultValue={post?.title} required />
              </Field>
              <SlugField defaultTitle={post?.title} defaultSlug={post?.slug} />
            </div>

            <Field
              label="Excerpt"
              htmlFor="field-excerpt"
              error={state.fieldErrors?.excerpt}
              className="mt-5"
              hint="A short summary shown on blog listing cards."
            >
              <Textarea id="field-excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt} required />
            </Field>

            <div className="mt-5">
              <RichTextEditor name="content" label="Content" defaultValue={post?.content} />
              {state.fieldErrors?.content && (
                <p className="mt-1.5 text-sm text-destructive">{state.fieldErrors.content}</p>
              )}
            </div>
          </div>

          <SeoFieldset
            pathPrefix="/blog/"
            defaultNoIndex={post?.noIndex}
            defaultMetaTitle={post?.metaTitle}
            defaultMetaDescription={post?.metaDescription}
            defaultMetaKeywords={post?.metaKeywords}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <StatusField defaultValue={post?.status ?? "DRAFT"} />
            <ScheduleField defaultValue={post?.scheduledAt} error={state.fieldErrors?.scheduledAt} />
            <SwitchField
              name="featured"
              label="Featured article"
              description="Highlight at top of blog"
              defaultChecked={post?.featured ?? false}
            />
            <CategorySelect categories={categories} defaultValue={post?.categoryId} />
            <TagPicker tags={tags} defaultSelected={post?.tags?.map((t) => t.id) ?? []} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <ImageUploadField name="featuredImage" defaultValue={post?.featuredImage} />
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
        <SubmitButton>{post ? "Save changes" : "Create post"}</SubmitButton>
        <Button type="button" variant="ghost" render={<Link href="/admin/posts" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
