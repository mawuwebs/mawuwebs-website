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

function useFieldValue(id: string, initial: string) {
  const [v, setV] = React.useState(initial);
  React.useEffect(() => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    const h = () => setV(el.value);
    const t = window.setTimeout(h, 0);
    el.addEventListener("input", h);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener("input", h);
    };
  }, [id]);
  return v;
}

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min && n <= max;
  return (
    <span className={ok ? "text-emerald-600" : n === 0 ? "text-muted-foreground" : "text-amber-600"}>
      {n}/{max}
    </span>
  );
}

export function SeoFieldset({
  defaultMetaTitle,
  defaultMetaDescription,
  defaultMetaKeywords,
  defaultNoIndex,
  pathPrefix = "/",
}: {
  defaultMetaTitle?: string | null;
  defaultMetaDescription?: string | null;
  defaultMetaKeywords?: string | null;
  defaultNoIndex?: boolean;
  /** Public URL path before the slug, e.g. "/blog/". Pages use "/". */
  pathPrefix?: string;
}) {
  const [metaTitle, setMetaTitle] = React.useState(defaultMetaTitle ?? "");
  const [metaDesc, setMetaDesc] = React.useState(defaultMetaDescription ?? "");
  const title = useFieldValue("field-title", "");
  const [content, setContent] = React.useState("");
  React.useEffect(() => {
    const read = () => {
      const el = document.querySelector<HTMLInputElement>('input[name="content"]');
      if (el) setContent(el.value);
    };
    const t0 = window.setTimeout(read, 0);
    const t = window.setInterval(read, 1500);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, []);
  const images = content.match(/<img\b[^>]*>/gi) ?? [];
  const wordCount = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const slug = useFieldValue("field-slug", "");

  const shownTitle = metaTitle || title || "Untitled";
  const shownDesc = metaDesc || "No meta description set. Search engines will pick text from the page.";
  const host = React.useSyncExternalStore(
    () => () => {},
    () => window.location.host || "yoursite.com",
    () => "yoursite.com"
  );
  const url = `${host}${pathPrefix}${slug}`.replace(/\/$/, "");

  const checks = [
    { ok: metaTitle.length >= 30 && metaTitle.length <= 60, text: "Meta title is 30–60 characters" },
    { ok: metaDesc.length >= 120 && metaDesc.length <= 160, text: "Meta description is 120–160 characters" },
    { ok: slug.length > 0 && slug.length <= 60, text: "Slug is set and short" },
    {
      ok: !!title && metaTitle.toLowerCase().includes(title.toLowerCase().split(" ")[0] ?? ""),
      text: "Meta title reuses the page's main keyword",
    },
    ...(content
      ? [
          { ok: !/<h1\b/i.test(content), text: "No H1 in content (page title is the H1)" },
          { ok: images.every((i) => /\balt="[^"]+"/i.test(i)), text: "All images have alt text" },
          { ok: /<a\b[^>]*href=/i.test(content), text: "Content has at least one link" },
          { ok: wordCount >= 300, text: `At least 300 words (now ${wordCount})` },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-5">
      <h3 className="text-sm font-semibold">SEO</h3>

      <div className="rounded-lg border border-border bg-background p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Google preview</p>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
        <p className="mt-0.5 line-clamp-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
          {shownTitle}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{shownDesc}</p>
      </div>

      <Field label="Meta title" htmlFor="field-metaTitle">
        <Input
          id="field-metaTitle"
          name="metaTitle"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          placeholder={title}
        />
        <p className="mt-1 text-right text-xs"><Counter n={metaTitle.length} min={30} max={60} /></p>
      </Field>
      <Field label="Meta description" htmlFor="field-metaDescription">
        <Textarea
          id="field-metaDescription"
          name="metaDescription"
          rows={3}
          value={metaDesc}
          onChange={(e) => setMetaDesc(e.target.value)}
        />
        <p className="mt-1 text-right text-xs"><Counter n={metaDesc.length} min={120} max={160} /></p>
      </Field>
      <Field label="Keywords" htmlFor="field-metaKeywords" hint="Comma-separated">
        <Input
          id="field-metaKeywords"
          name="metaKeywords"
          defaultValue={defaultMetaKeywords ?? ""}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="noIndex"
          defaultChecked={defaultNoIndex}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span>
          Hide from search engines
          <span className="block text-xs text-muted-foreground">
            Adds noindex and removes this page from the sitemap.
          </span>
        </span>
      </label>

      <ul className="space-y-1 text-xs">
        {checks.map((c) => (
          <li key={c.text} className={c.ok ? "text-emerald-600" : "text-muted-foreground"}>
            {c.ok ? "✓" : "○"} {c.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
