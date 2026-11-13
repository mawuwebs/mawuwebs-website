import type { Metadata } from "next";

export const SYSTEM_PAGE_SLUGS = ["about", "privacy-policy", "terms-of-service"];

export function siteUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

/** Metadata with canonical URL, Open Graph and Twitter tags filled from one place. */
export function buildMetadata(opts: {
  title: string;
  description?: string | null;
  keywords?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const description = opts.description ?? undefined;
  const images = opts.image ? [opts.image] : undefined;
  return {
    title: opts.title,
    description,
    keywords: opts.keywords ?? undefined,
    alternates: { canonical: opts.path },
    robots: opts.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: opts.title,
      description,
      url: opts.path,
      type: opts.type ?? "website",
      images,
    },
    twitter: { card: "summary_large_image", title: opts.title, description, images },
  };
}
