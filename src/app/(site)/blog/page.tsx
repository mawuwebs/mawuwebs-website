import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterChips, ResultSummary, EmptyState } from "@/components/site/filter-chips";
import { CtaBanner } from "@/components/site/cta-banner";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { BlogCard } from "@/components/site/blog-card";
import { Reveal } from "@/components/site/reveal";
import { Pagination } from "@/components/site/pagination";
import {
  getPublishedPosts,
  getPublishedPostsCount,
  getPostCategories,
  getFeaturedPost,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog & Insights",
  description: "IT guides, security tips, and lessons from the Mawuwebs Solutions team.",
};

const PAGE_SIZE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const { category, search, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const showFeatured = !category && !search && page === 1;
  const [posts, total, categories, featured] = await Promise.all([
    getPublishedPosts({ category, search, page, pageSize: PAGE_SIZE }),
    getPublishedPostsCount({ category, search }),
    getPostCategories(),
    showFeatured ? getFeaturedPost() : Promise.resolve(null),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const listPosts = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Insights on IT, security, web, and growth"
        description="Practical lessons from the projects we ship, written for founders and product teams."
        illustration={<Illustration variant="document" className="h-full w-full" />}
      />

      <Section className="pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FilterChips
            label="Filter articles"
            chips={[
              { label: "All posts", href: search ? `/blog?search=${encodeURIComponent(search)}` : "/blog", active: !category },
              ...categories.map((cat) => ({
                label: cat.name,
                href: `/blog?category=${cat.slug}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
                active: category === cat.slug,
              })),
            ]}
          />
          <form method="get" role="search" className="flex w-full items-center gap-2 sm:max-w-xs">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="blog-search" className="sr-only">Search articles</label>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                id="blog-search"
                name="search"
                defaultValue={search}
                placeholder="Search articles..."
                className="h-11 pl-9"
              />
            </div>
            <button type="submit" className="h-11 shrink-0 rounded-lg bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark">
              Search
            </button>
          </form>
        </div>
        {(category || search) && (
          <div className="mt-6">
            <ResultSummary count={total} noun="article" query={search} clearHref="/blog" />
          </div>
        )}
      </Section>

      {featured && (
        <Section className="pb-0">
          <Reveal>
            <Link
              href={`/blog/${featured.slug}`}
              className="group spotlight grid grid-cols-1 gap-8 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-all duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 sm:p-4 lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                {featured.featuredImage && (
                  <Image
                    src={featured.featuredImage}
                    alt={featured.title}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-col justify-center p-4 sm:p-6">
                <Badge className="w-fit bg-accent text-accent-foreground">Featured</Badge>
                {featured.publishedAt && (
                  <time className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {format(featured.publishedAt, "MMMM d, yyyy")}
                  </time>
                )}
                <h2 className="mt-2 font-display text-2xl font-bold text-balance group-hover:text-accent sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Read article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        </Section>
      )}

      <Section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listPosts.map((post, i) => (
            <Reveal key={post.id} delay={i * 80}>
              <BlogCard post={post} headingLevel={2} />
            </Reveal>
          ))}
        </div>
        {listPosts.length === 0 && !featured && (
          <EmptyState
            title="No articles found"
            body="Try a different keyword or browse every article."
            actionHref="/blog"
            actionLabel="View all articles"
          />
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/blog"
          searchParams={{ category, search }}
        />
      </Section>
    <CtaBanner
        title="Need a hand with something in these articles?"
        description="Our team can take it off your plate. Tell us what you're dealing with."
        ctaText="Get in touch"
        ctaUrl="/contact"
      />
    </>
  );
}
