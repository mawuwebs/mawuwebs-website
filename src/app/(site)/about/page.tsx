import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section, SectionHeading } from "@/components/site/container";
import { RichText } from "@/components/site/rich-text";
import { Metrics } from "@/components/site/metrics";
import { TestimonialCard } from "@/components/site/testimonial-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { getPageBySlug } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { getPublishedTestimonials } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("about");
  if (!page) return { title: "About" };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    keywords: page.metaKeywords ?? undefined,
  };
}

export default async function AboutPage() {
  const [page, settings, testimonials] = await Promise.all([
    getPageBySlug("about"),
    getSiteSettings(),
    getPublishedTestimonials(3),
  ]);

  if (!page) notFound();

  return (
    <>
      <PageHeader
        eyebrow="About Us"
        title="We build digital products that mean business"
        description="Get to know the studio behind Mawuwebs Solutions."
        illustration={<Illustration variant="team" className="h-full w-full" />}
      />

      <Section>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <RichText html={page.content} className="max-w-none" />
          {settings.metricsList.length > 0 && (
          <div className="self-start rounded-2xl border border-border bg-secondary/50 p-8 lg:sticky lg:top-24">
            <h3 className="font-display text-lg font-semibold">By the numbers</h3>
            <div className="mt-6">
              <Metrics metrics={settings.metricsList} bare />
            </div>
          </div>
          )}
        </div>
      </Section>

      {testimonials.length > 0 && (
        <Section className="border-t border-border bg-secondary/50">
          <Reveal>
            <SectionHeading
              eyebrow="Client love"
              title="Trusted by founders and teams"
              align="center"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} delay={i * 80}>
                <TestimonialCard testimonial={t} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <CtaBanner
        title="Let's build something worth talking about"
        description="Tell us about your goals and we'll show you how we can help."
      />
    </>
  );
}
