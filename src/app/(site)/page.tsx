import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/site/hero";
import { Section, SectionHeading } from "@/components/site/container";
import { ServiceCard } from "@/components/site/service-card";
import { ProjectCard } from "@/components/site/project-card";
import { TestimonialCard } from "@/components/site/testimonial-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Metrics } from "@/components/site/metrics";
import { Reveal } from "@/components/site/reveal";
import { Illustration } from "@/components/site/illustrations";
import { getSiteSettings } from "@/lib/settings";
import {
  getFeaturedServices,
  getFeaturedProjects,
  getPublishedTestimonials,
} from "@/lib/content";

export default async function HomePage() {
  const [settings, services, projects, testimonials] = await Promise.all([
    getSiteSettings(),
    getFeaturedServices(6),
    getFeaturedProjects(3),
    getPublishedTestimonials(6),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: settings.siteName,
    description: settings.heroSubheading,
    email: settings.contactEmail,
    telephone: settings.phone,
    address: settings.address,
    url: process.env.AUTH_URL ?? "http://localhost:3000",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero
        headline={settings.heroHeadline}
        subheading={settings.heroSubheading}
        ctaPrimaryText={settings.heroCtaPrimaryText}
        ctaPrimaryUrl={settings.heroCtaPrimaryUrl}
        ctaSecondaryText={settings.heroCtaSecondaryText}
        ctaSecondaryUrl={settings.heroCtaSecondaryUrl}
      />

      {/* Featured services */}
      <Section>
        <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="What we do"
            title="Everything IT, under one roof"
            description="From websites and apps to networks, security and everyday IT support, we look after the technology so you can run your business."
          />
          <Button render={<Link href="/services" />} variant="outline" className="shrink-0">
            View all services
            <ArrowRight className="size-4" />
          </Button>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={i * 80}>
              <ServiceCard
                title={service.title}
                slug={service.slug}
                description={service.description}
                icon={service.icon}
              />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* About preview */}
      <Section className="bg-secondary/50">
        <Reveal className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-white shadow-2xl">
              <Illustration variant="team" className="h-full w-full" />
            </div>
          </div>
          <div>
            <SectionHeading
              eyebrow="Who we are"
              title="An IT partner that acts like part of your team"
              description="Mawuwebs Solutions covers the full range of IT: software and websites, networks and infrastructure, security, hardware and support. One team, one point of contact."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Dedicated project lead on every engagement",
                "Transparent timelines and fixed-scope pricing",
                "Support after launch, not just before it",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground/80">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Button render={<Link href="/about" />} size="lg" className="mt-8">
              More about us
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Reveal>
      </Section>

      {/* Metrics */}
      {settings.metricsList.length > 0 && (
        <Section className="py-14 sm:py-16">
          <Reveal>
            <Metrics metrics={settings.metricsList} />
          </Reveal>
        </Section>
      )}

      {/* Featured projects */}
      <Section className="border-t border-border">
        <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Our work"
            title="Recent projects we're proud of"
            description="A snapshot of the systems and products we've designed, built, and supported for clients."
          />
          <Button render={<Link href="/portfolio" />} variant="outline" className="shrink-0">
            View portfolio
            <ArrowRight className="size-4" />
          </Button>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 80}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <Section className="bg-secondary/50">
          <Reveal>
            <SectionHeading
              eyebrow="Client love"
              title="Don't just take our word for it"
              align="center"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
            {testimonials.map((t, i) => (
              <Reveal
                key={t.id}
                delay={i * 80}
                className="w-[82%] shrink-0 snap-center sm:w-auto sm:shrink"
              >
                <TestimonialCard testimonial={t} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <CtaBanner />
    </>
  );
}
