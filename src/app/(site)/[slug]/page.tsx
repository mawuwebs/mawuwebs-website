import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { RichText } from "@/components/site/rich-text";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata, siteUrl } from "@/lib/seo";
import { ldJson } from "@/lib/sanitize";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return { title: "Page not found" };
  return buildMetadata({
    title: page.metaTitle ?? page.title,
    description: page.metaDescription,
    keywords: page.metaKeywords,
    path: `/${page.slug}`,
    image: page.featuredImage,
    noIndex: page.noIndex,
  });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (SYSTEM_PAGE_SLUGS.includes(slug)) notFound();
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    url: `${siteUrl()}/${page.slug}`,
    description: page.metaDescription ?? undefined,
    dateModified: page.updatedAt.toISOString(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <PageHeader eyebrow="Page" title={page.title} />
      <Section>
        <Breadcrumbs
          variant="light"
          className="mx-auto mb-6 max-w-3xl"
          items={[{ label: "Home", href: "/" }, { label: page.title }]}
        />
        <RichText html={page.content} className="mx-auto max-w-3xl" />
      </Section>
    </>
  );
}
