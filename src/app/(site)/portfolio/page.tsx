import type { Metadata } from "next";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { Pagination } from "@/components/site/pagination";
import {
  getPublishedProjects,
  getPublishedProjectsCount,
  getProjectCategories,
} from "@/lib/content";
import { FilterChips, ResultSummary, EmptyState } from "@/components/site/filter-chips";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Browse our portfolio of IT projects: web apps, e-commerce stores, mobile apps, infrastructure and more.",
};

const PAGE_SIZE = 9;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [projects, total, categories] = await Promise.all([
    getPublishedProjects({ category, page, pageSize: PAGE_SIZE }),
    getPublishedProjectsCount({ category }),
    getProjectCategories(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  // On the unfiltered first page, show our own products separately from client work.
  const splitProducts = !category && page === 1;
  const products = splitProducts ? projects.filter((p) => p.category?.slug === "software-product") : [];
  const clientWork = splitProducts ? projects.filter((p) => p.category?.slug !== "software-product") : projects;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Work we're proud to show off"
        description="A selection of products we've designed and built for clients across industries."
        illustration={<Illustration variant="dashboard" className="h-full w-full" />}
      />

      {products.length > 0 && (
        <Section>
          <h2 className="font-display text-2xl font-bold">Our products</h2>
          <p className="mt-2 text-muted-foreground">Software we have designed, built and run ourselves.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((project, i) => (
              <Reveal key={project.id} delay={i * 80}>
                <ProjectCard project={project} headingLevel={3} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section>
        {products.length > 0 && <h2 className="mb-6 font-display text-2xl font-bold">Client work</h2>}
        <FilterChips
          label="Filter projects"
          chips={[
            { label: "All projects", href: "/portfolio", active: !category },
            ...categories.map((cat) => ({
              label: cat.name,
              href: `/portfolio?category=${cat.slug}`,
              active: category === cat.slug,
            })),
          ]}
        />
        <div className="mt-6">
          <ResultSummary count={total} noun="project" clearHref={category ? "/portfolio" : undefined} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:[&>*:nth-child(3n+1):last-child]:col-start-2">
          {clientWork.map((project, i) => (
            <Reveal key={project.id} delay={i * 80}>
              <ProjectCard project={project} headingLevel={products.length > 0 ? 3 : 2} />
            </Reveal>
          ))}
        </div>

        {clientWork.length === 0 && (
          <EmptyState
            title="No projects in this category yet"
            body="We're adding case studies regularly. See everything we've shipped so far."
            actionHref="/portfolio"
            actionLabel="View all projects"
          />
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/portfolio"
          searchParams={{ category }}
        />
      </Section>

      <CtaBanner
        title="Want results like these?"
        description="Let's talk about what we can build for your business."
      />
    </>
  );
}
