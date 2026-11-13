import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { CtaBanner } from "@/components/site/cta-banner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPublishedFaqs } from "@/lib/content";
import { toSlug } from "@/lib/slug";
import { ldJson } from "@/lib/sanitize";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq" },
  description: "Answers to common questions about working with Mawuwebs Solutions.",
};

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    (acc[faq.category] ??= []).push(faq);
    return acc;
  }, {});

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(faqLd) }}
        />
      )}
      <PageHeader
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Everything you need to know before getting started. Can't find your answer? Just ask."
        illustration={<Illustration variant="list" className="h-full w-full" />}
      />

      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
          {faqs.length > 0 && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Jump to
              </p>
              <nav aria-label="FAQ categories" className="-mx-5 mt-3 flex flex-row gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible">
                {Object.keys(grouped).map((category) => (
                  <a
                    key={category}
                    href={`#${toSlug(category)}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium whitespace-nowrap text-foreground/80 hover:bg-muted hover:text-accent lg:min-h-0 lg:rounded-md lg:border-0 lg:px-0 lg:py-1.5 lg:hover:bg-transparent"
                  >
                    {category}
                  </a>
                ))}
              </nav>
              <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-6">
                <p className="font-display text-base font-semibold">
                  Still have questions?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&rsquo;re happy to help — reach out any time.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Get in touch
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          )}

          <div className="max-w-3xl space-y-12">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} id={toSlug(category)} className="scroll-mt-24">
                <h2 className="font-display text-xl font-bold">{category}</h2>
                <Accordion className="mt-4">
                  {items.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
            {faqs.length === 0 && (
              <p className="text-center text-muted-foreground">
                Questions will appear here once published.
              </p>
            )}
          </div>
        </div>
      </Section>

      <CtaBanner
        title="Still have questions?"
        description="Reach out and we'll get back to you within one business day."
      />
    </>
  );
}
