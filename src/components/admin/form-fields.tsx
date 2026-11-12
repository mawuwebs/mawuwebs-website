"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toSlug } from "@/lib/slug";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function SlugField({
  titleInputName = "title",
  name = "slug",
  defaultTitle = "",
  defaultSlug = "",
}: {
  titleInputName?: string;
  name?: string;
  defaultTitle?: string;
  defaultSlug?: string;
}) {
  const [slug, setSlug] = React.useState(
    () => defaultSlug || (defaultTitle ? toSlug(defaultTitle) : "")
  );
  const [touched, setTouched] = React.useState(Boolean(defaultSlug));

  React.useEffect(() => {
    if (touched) return;
    const titleInput = document.getElementById(`field-${titleInputName}`) as
      | HTMLInputElement
      | null;
    if (!titleInput) return;
    const handler = () => setSlug(toSlug(titleInput.value));
    titleInput.addEventListener("input", handler);
    return () => titleInput.removeEventListener("input", handler);
  }, [touched, titleInputName]);

  return (
    <Field label="Slug" htmlFor={`field-${name}`} hint="Used in the page URL. Auto-generated from the title.">
      <Input
        id={`field-${name}`}
        name={name}
        value={slug}
        onChange={(e) => {
          setTouched(true);
          setSlug(toSlug(e.target.value));
        }}
        required
      />
    </Field>
  );
}

export function SeoFieldset({
  defaultMetaTitle,
  defaultMetaDescription,
  defaultMetaKeywords,
}: {
  defaultMetaTitle?: string | null;
  defaultMetaDescription?: string | null;
  defaultMetaKeywords?: string | null;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-5">
      <h3 className="text-sm font-semibold">SEO</h3>
      <Field label="Meta title" htmlFor="field-metaTitle">
        <Input id="field-metaTitle" name="metaTitle" defaultValue={defaultMetaTitle ?? ""} />
      </Field>
      <Field label="Meta description" htmlFor="field-metaDescription">
        <Textarea
          id="field-metaDescription"
          name="metaDescription"
          rows={3}
          defaultValue={defaultMetaDescription ?? ""}
        />
      </Field>
      <Field label="Keywords" htmlFor="field-metaKeywords" hint="Comma-separated">
        <Input
          id="field-metaKeywords"
          name="metaKeywords"
          defaultValue={defaultMetaKeywords ?? ""}
        />
      </Field>
    </div>
  );
}
