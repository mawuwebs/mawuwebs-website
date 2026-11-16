import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Rocket } from "lucide-react";
import { ProjectShowcase } from "@/components/site/project-showcase";
import { ProjectGallery } from "@/components/site/project-gallery";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { RichText } from "@/components/site/rich-text";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { getProjectBySlug, getRelatedProjects, getAdjacentProjects, live } from "@/lib/content";
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

  const [related, { prev, next }, settings] = await Promise.all([
    getRelatedProjects(project.id, project.categoryId, 3),
    getAdjacentProjects(project.id),
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
  const mobileShot = gallery.find((g) => /mobile/i.test(g));
  const facts = [
    { label: "Client", value: project.client },
    { label: "Year", value: project.year },
    { label: "Our role", value: project.role },
    { label: "Category", value: project.category?.name },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

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
        {facts.length > 0 && (
          <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-border bg-secondary/50 p-6 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{f.label}</dt>
                <dd className="mt-1 text-sm font-semibold sm:text-base">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {project.featuredImage && (
          <ProjectShowcase
            title={displayTitle}
            desktop={project.featuredImage}
            mobile={mobileShot}
            url={project.projectUrl}
          />
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

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-secondary/50 p-7">
              {comingSoon ? (
                <>
                  <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-orange)]/15 px-3 py-1 text-xs font-semibold">
                    <Rocket className="size-3.5" aria-hidden />
                    Launching soon
                  </p>
                  <h2 className="font-display text-lg font-semibold">Be first to know</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Leave your email and we&apos;ll tell you the day {displayTitle} launches. No spam.
                  </p>
                  <NewsletterForm className="mt-4" />
                </>
              ) : (
                <>
                  <h2 className="font-display text-lg font-semibold">Want something like this?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tell us what you need and we&apos;ll reply within one business day.
                  </p>
                  {project.projectUrl && (
                    <Button
                      render={<a href={project.projectUrl} target="_blank" rel="noopener noreferrer" />}
                      variant="outline"
                      className="mt-5 w-full"
                    >
                      Visit live site
                      <ExternalLink className="size-4" />
                    </Button>
                  )}
                </>
              )}
              <Button render={<Link href="/start-a-project" />} className="mt-3 w-full">
                Start a similar project
              </Button>
              <Button render={<Link href="/book-a-call" />} variant="ghost" className="mt-1 w-full">
                Or book a free call
              </Button>
              {project.tags.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Built with</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.tags.map((t) => (
                      <Badge key={t.id} variant="outline">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
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
            <ProjectGallery title={displayTitle} images={gallery} />
          </div>
        )}

        {(prev || next) && (
          <nav aria-label="More projects" className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              prev && { p: prev, dir: "Previous project", href: `/portfolio/${prev.slug}` },
              next && { p: next, dir: "Next project", href: `/portfolio/${next.slug}` },
            ]
              .filter(Boolean)
              .map((x) => {
                const n = x as { p: NonNullable<typeof prev>; dir: string; href: string };
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
                  >
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {n.p.featuredImage && (
                        <Image src={n.p.featuredImage} alt="" fill sizes="96px" className="object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{n.dir}</p>
                      <p className="mt-1 truncate font-display text-lg font-semibold">{n.p.title.replace(/\s*\(coming soon\)/i, "")}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-accent-foreground/80">
                        View project <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                      </p>
                    </div>
                  </Link>
                );
              })}
          </nav>
        )}

        <div className="mt-8">
          <Button render={<Link href="/portfolio" />} variant="ghost">
            <ArrowLeft className="size-4" />
            All projects
          </Button>
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
