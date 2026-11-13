import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { RichText } from "@/components/site/rich-text";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("terms-of-service");
  if (!page) return { title: "Terms of Service" };
  return buildMetadata({
    title: page.metaTitle ?? page.title,
    description: page.metaDescription,
    keywords: page.metaKeywords,
    path: "/terms-of-service",
    image: page.featuredImage,
    noIndex: page.noIndex,
  });
}

export default async function TermsOfServicePage() {
  const page = await getPageBySlug("terms-of-service");
  if (!page) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title={page.title}
        illustration={<Illustration variant="document" className="h-full w-full" />}
      />
      <Section>
        <RichText html={page.content} className="mx-auto max-w-3xl" />
      </Section>
    </>
  );
}
