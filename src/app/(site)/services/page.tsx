import type { Metadata } from "next";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ServiceCard } from "@/components/site/service-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { Pagination } from "@/components/site/pagination";
import { getPublishedServices, getPublishedServicesCount } from "@/lib/content";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";
import { FilterChips, ResultSummary, EmptyState } from "@/components/site/filter-chips";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore our full range of IT services: support, networking, cybersecurity, hardware, cloud, web and mobile development, and more.",
};

const PAGE_SIZE = 12;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; group?: string }>;
}) {
  const { page: pageParam, group: groupParam } = await searchParams;
  const group = (SERVICE_CATEGORIES as readonly string[]).includes(groupParam ?? "") ? groupParam : undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  const [services, total] = await Promise.all([
    getPublishedServices({ page, pageSize: PAGE_SIZE, group }),
    getPublishedServicesCount({ group }),
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
        <FilterChips
          label="Filter services"
          chips={[undefined, ...SERVICE_CATEGORIES].map((c) => ({
            label: c ?? "All services",
            href: c ? `/services?group=${encodeURIComponent(c)}` : "/services",
            active: group === c,
          }))}
        />
        <div className="mt-6 mb-8">
          <ResultSummary count={total} noun="service" clearHref={group ? "/services" : undefined} />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={i * 80}>
              <ServiceCard
                headingLevel={2}
                title={service.title}
                slug={service.slug}
                description={service.description}
                icon={service.icon}
              />
            </Reveal>
          ))}
        </div>
        {services.length === 0 && (
          <EmptyState
            title="No services here yet"
            body="Nothing is published in this group. Browse everything or tell us what you need."
            actionHref="/services"
            actionLabel="View all services"
          />
        )}
        <Pagination currentPage={page} totalPages={totalPages} basePath="/services" searchParams={{ group }} />
      </Section>

      <CtaBanner
        title="Not sure which service you need?"
        description="Book a free consultation and we'll help you map out the right approach."
      />
    </>
  );
}
