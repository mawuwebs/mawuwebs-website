import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { RichText } from "@/components/site/rich-text";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { getProjectBySlug, getRelatedProjects, getNextProject, live } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { ldJson } from "@/lib/sanitize";

export async function generateStaticParams() {
  const projects = await prisma.project.findMany({
    where: live(),
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
    robots: project.noIndex ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/portfolio/${project.slug}` },
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

  const comingSoon = /coming soon/i.test(project.title);
  const displayTitle = project.title.replace(/\s*\(coming soon\)/i, "").trim();
  const plain = (h: string) => h.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  // Skip the body when it only repeats the header description.
  const hasBody = plain(project.content) !== "" && plain(project.content) !== plain(project.description);
  const hasStory = Boolean(project.challenge || project.solution);

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
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <PageHeader
        eyebrow={`${project.category?.name ?? "Project"}${comingSoon ? " · Coming soon" : ""}`}
        title={displayTitle}
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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-forest/10">
            <div className="flex items-center gap-1.5 border-b border-border bg-secondary/70 px-4 py-3" aria-hidden>
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              {project.projectUrl && (
                <span className="ml-3 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                  {project.projectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              )}
            </div>
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={project.featuredImage}
                alt={`${displayTitle} preview`}
                fill
                priority
                sizes="(min-width: 1280px) 1152px, 100vw"
                className="object-cover object-top"
              />
            </div>
          </div>
        )}

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
          <div className="space-y-8">
            {hasBody && <RichText html={project.content} className="max-w-none" />}
            {project.challenge && (
              <div>
                <h2 className="font-display text-xl font-semibold">The challenge</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-muted-foreground">{project.challenge}</p>
              </div>
            )}
            {project.solution && (
              <div className="border-t border-border pt-8">
                <h2 className="font-display text-xl font-semibold">What we did</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-muted-foreground">{project.solution}</p>
              </div>
            )}
            {!hasBody && !hasStory && (
              <p className="leading-relaxed text-muted-foreground">{project.description}</p>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-secondary/50 p-7">
              {comingSoon && (
                <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-orange)]/15 px-3 py-1 text-xs font-semibold text-foreground">
                  <Rocket className="size-3.5" aria-hidden />
                  Launching soon
                </p>
              )}
              <h2 className="font-display text-lg font-semibold">Project details</h2>
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
              {!project.projectUrl && project.title.includes("coming soon") && (
                <Button render={<Link href="/contact#message" />} className="mt-6 w-full">
                  Join the waitlist
                </Button>
              )}
              <Button render={<Link href="/start-a-project" />} className="mt-3 w-full">
                Start a similar project
              </Button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-14 rounded-2xl bg-forest p-8 text-white">
            <h2 className="font-display text-lg font-semibold">Results</h2>
            <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {results.map((r) => (
                <div key={r.label}>
                  <dd className="font-display text-4xl font-bold text-yellow">{r.value}</dd>
                  <dt className="mt-1 text-sm text-white/70">{r.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-14">
            <h2 className="font-display text-xl font-semibold">Screens</h2>
            <div
              className={`mt-5 grid grid-cols-1 gap-5 ${
                gallery.length === 1 ? "" : gallery.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
              }`}
            >
              {gallery.map((src, i) => {
                const phone = /mobile/i.test(src);
                return (
                  <div
                    key={i}
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl border border-border ${phone ? "bg-forest" : "bg-secondary/50"}`}
                  >
                    <Image
                      src={src}
                      alt={`${displayTitle} ${phone ? "mobile " : ""}screenshot ${i + 1}`}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className={phone ? "object-contain py-3" : "object-cover object-top"}
                    />
                  </div>
                );
              })}
            </div>
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
