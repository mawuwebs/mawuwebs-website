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
import { cn } from "@/lib/utils";
import Link from "next/link";

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
        <div className="mb-10 flex flex-wrap gap-2" aria-label="Filter services">
          {[undefined, ...SERVICE_CATEGORIES].map((c) => (
            <Link
              key={c ?? "all"}
              href={c ? `/services?group=${encodeURIComponent(c)}` : "/services"}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                group === c ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
              )}
            >
              {c ?? "All services"}
            </Link>
          ))}
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
          <p className="text-center text-muted-foreground">
            Services will appear here once published.
          </p>
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
