import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/site/container";
import { Illustration } from "@/components/site/illustrations";
import { getIcon } from "@/components/site/icon-map";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { CtaBanner } from "@/components/site/cta-banner";
import { getServiceBySlug, getPublishedServices } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { SERVICE_SLUG_TO_BRIEF_TYPE } from "@/lib/brief";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const services = await prisma.service.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service" };
  return {
    title: service.metaTitle ?? service.title,
    description: service.metaDescription ?? service.description,
    keywords: service.metaKeywords ?? undefined,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, allServices, settings] = await Promise.all([
    getServiceBySlug(slug),
    getPublishedServices(),
    getSiteSettings(),
  ]);

  if (!service) notFound();
  const Icon = getIcon(service.icon);
  const briefType = SERVICE_SLUG_TO_BRIEF_TYPE[service.slug];
  const otherServices = allServices.filter((s) => s.id !== service.id).slice(0, 3);

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: `${baseUrl}/services/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: settings.siteName,
      url: baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Service"
        title={service.title}
        description={service.description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
        illustration={<Illustration variant="dashboard" className="h-full w-full" />}
      />

      <Section>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <RichText html={service.content} className="max-w-none" />

          <div className="space-y-6">
            {service.featuredImage && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
                <Image
                  src={service.featuredImage}
                  alt={service.title}
                  fill
                  sizes="(min-width: 1024px) 35vw, 90vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="rounded-2xl border border-border bg-secondary/50 p-7">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {/* Looked up from a static icon registry, not created dynamically. */}
                {/* eslint-disable-next-line react-hooks/static-components */}
                <Icon className="size-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                Interested in {service.title}?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Let&apos;s discuss your project and see how we can help you reach your goals.
              </p>
              <Button render={<Link href={briefType ? `/start-a-project?type=${encodeURIComponent(briefType)}` : "/start-a-project"} />} className="mt-5 w-full">
                Request a quote
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Button render={<Link href="/services" />} variant="ghost">
            <ArrowLeft className="size-4" />
            Back to all services
          </Button>
        </div>
      </Section>

      {otherServices.length > 0 && (
        <Section className="border-t border-border bg-secondary/50">
          <h2 className="font-display text-2xl font-bold">Other services</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {otherServices.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.slug}`}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40"
              >
                <h3 className="font-display font-semibold">{s.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {s.description}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <CtaBanner />
    </>
  );
}
