import type { Metadata } from "next";
import Link from "next/link";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { Pagination } from "@/components/site/pagination";
import { Badge } from "@/components/ui/badge";
import {
  getPublishedProjects,
  getPublishedProjectsCount,
  getProjectCategories,
} from "@/lib/content";
import { cn } from "@/lib/utils";

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

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Work we're proud to show off"
        description="A selection of products we've designed and built for clients across industries."
        illustration={<Illustration variant="dashboard" className="h-full w-full" />}
      />

      <Section>
        <div className="flex flex-wrap gap-2">
          <Link href="/portfolio">
            <Badge
              variant={!category ? "default" : "outline"}
              className={cn("cursor-pointer px-4 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5", !category && "bg-forest text-white")}
            >
              All Projects
            </Badge>
          </Link>
          {categories.map((cat) => (
            <Link key={cat.id} href={`/portfolio?category=${cat.slug}`}>
              <Badge
                variant={category === cat.slug ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-4 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5",
                  category === cat.slug && "bg-forest text-white"
                )}
              >
                {cat.name}
              </Badge>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:[&>*:nth-child(3n+1):last-child]:col-start-2">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 80}>
              <ProjectCard project={project} headingLevel={2} />
            </Reveal>
          ))}
        </div>

        {projects.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            No projects found in this category yet.
          </p>
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
