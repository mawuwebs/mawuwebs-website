import type { Metadata } from "next";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ServiceCard } from "@/components/site/service-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { Pagination } from "@/components/site/pagination";
import { getPublishedServices, getPublishedServicesCount } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore our full range of IT services: support, networking, cybersecurity, hardware, cloud, web and mobile development, and more.",
};

const PAGE_SIZE = 12;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [services, total] = await Promise.all([
    getPublishedServices({ page, pageSize: PAGE_SIZE }),
    getPublishedServicesCount(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="IT services for every part of your business"
        description="From day-to-day support to big builds, we cover it. Pick one service or let us look after it all."
        illustration={<Illustration variant="list" className="h-full w-full" />}
      />

      <Section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        {services.length === 0 && (
          <p className="text-center text-muted-foreground">
            Services will appear here once published.
          </p>
        )}
        <Pagination currentPage={page} totalPages={totalPages} basePath="/services" />
      </Section>

      <CtaBanner
        title="Not sure which service you need?"
        description="Book a free consultation and we'll help you map out the right approach."
      />
    </>
  );
}
