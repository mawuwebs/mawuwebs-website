import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { RichText } from "@/components/site/rich-text";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { getProjectBySlug, getRelatedProjects, getNextProject } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const projects = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project" };
  return {
    title: project.metaTitle ?? project.title,
    description: project.metaDescription ?? project.description,
    keywords: project.metaKeywords ?? undefined,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [related, next, settings] = await Promise.all([
    getRelatedProjects(project.id, project.categoryId, 3),
    getNextProject(project.id),
    getSiteSettings(),
  ]);

  let gallery: string[] = [];
  try {
    gallery = JSON.parse(project.gallery);
  } catch {
    gallery = [];
  }

  let results: { label: string; value: string }[] = [];
  try {
    results = JSON.parse(project.results);
  } catch {
    results = [];
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    url: `${baseUrl}/portfolio/${project.slug}`,
    image: project.featuredImage ? `${baseUrl}${project.featuredImage}` : undefined,
    creator: {
      "@type": "Organization",
      name: settings.siteName,
      url: baseUrl,
    },
    keywords: project.tags.map((t) => t.name).join(", ") || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow={project.category?.name ?? "Project"}
        title={project.title}
        description={project.description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Portfolio", href: "/portfolio" },
          { label: project.title },
        ]}
        illustration={<Illustration variant="dashboard" className="h-full w-full" />}
      />

      <Section>
        {project.featuredImage && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border">
            <Image
              src={project.featuredImage}
              alt={project.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <RichText html={project.content} className="max-w-none" />

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-secondary/50 p-7">
              <h3 className="font-display text-lg font-semibold">Project details</h3>
              <dl className="mt-5 space-y-4 text-sm">
                {project.client && (
                  <div>
                    <dt className="text-muted-foreground">Client</dt>
                    <dd className="mt-0.5 font-medium">{project.client}</dd>
                  </div>
                )}
                {project.year && (
                  <div>
                    <dt className="text-muted-foreground">Year</dt>
                    <dd className="mt-0.5 font-medium">{project.year}</dd>
                  </div>
                )}
                {project.role && (
                  <div>
                    <dt className="text-muted-foreground">Our role</dt>
                    <dd className="mt-0.5 font-medium">{project.role}</dd>
                  </div>
                )}
                {project.category && (
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="mt-0.5 font-medium">{project.category.name}</dd>
                  </div>
                )}
                {project.tags.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Tags</dt>
                    <dd className="mt-2 flex flex-wrap gap-1.5">
                      {project.tags.map((t) => (
                        <Badge key={t.id} variant="outline">
                          {t.name}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              {project.projectUrl && (
                <Button
                  render={
                    <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" />
                  }
                  variant="outline"
                  className="mt-6 w-full"
                >
                  Visit live site
                  <ExternalLink className="size-4" />
                </Button>
              )}
              <Button render={<Link href="/start-a-project" />} className="mt-3 w-full">
                Start a similar project
              </Button>
            </div>
          </div>
        </div>

        {(project.challenge || project.solution || results.length > 0) && (
          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {project.challenge && (
              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="font-display text-lg font-semibold">The challenge</h3>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {project.challenge}
                </p>
              </div>
            )}
            {project.solution && (
              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="font-display text-lg font-semibold">What we did</h3>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {project.solution}
                </p>
              </div>
            )}
            {results.length > 0 && (
              <div className="rounded-2xl bg-forest p-7 text-white">
                <h3 className="font-display text-lg font-semibold">Results</h3>
                <dl className="mt-4 space-y-4">
                  {results.map((r) => (
                    <div key={r.label}>
                      <dd className="font-display text-3xl font-bold text-yellow">{r.value}</dd>
                      <dt className="text-sm text-white/70">{r.label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {gallery.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
              >
                <Image
                  src={src}
                  alt={`${project.title} screenshot ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
          <Button render={<Link href="/portfolio" />} variant="ghost">
            <ArrowLeft className="size-4" />
            Back to portfolio
          </Button>
          {next && (
            <Button render={<Link href={`/portfolio/${next.slug}`} />} variant="outline">
              Next: {next.title}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="border-t border-border bg-secondary/50">
          <h2 className="font-display text-2xl font-bold">More projects</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Section>
      )}

      <CtaBanner />
    </>
  );
}
