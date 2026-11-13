import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section, Container } from "@/components/site/container";
import { RichText } from "@/components/site/rich-text";
import { BlogCard } from "@/components/site/blog-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ShareButtons } from "@/components/site/share-buttons";
import { CtaBanner } from "@/components/site/cta-banner";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { withToc } from "@/lib/toc";
import { readingTime } from "@/lib/reading-time";
import { getPostBySlug, getRelatedPosts, livePost } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { ldJson } from "@/lib/sanitize";

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: livePost(),
    select: { slug: true },
  });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article" };
  return {
    robots: post.noIndex ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    keywords: post.metaKeywords ?? undefined,
    openGraph: post.featuredImage ? { images: [post.featuredImage] } : undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [related, settings] = await Promise.all([
    getRelatedPosts(post.id, post.categoryId, 3),
    getSiteSettings(),
  ]);

  const { html: bodyHtml, items: toc } = withToc(post.content);

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage ? `${baseUrl}${post.featuredImage}` : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: settings.siteName },
    publisher: {
      "@type": "Organization",
      name: settings.siteName,
      url: baseUrl,
    },
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <div className="border-b border-border bg-secondary/40">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <Breadcrumbs
              variant="light"
              className="mb-5"
              items={[
                { label: "Home", href: "/" },
                { label: "Blog", href: "/blog" },
                { label: post.title },
              ]}
            />
            <div className="flex items-center gap-3 text-sm">
              {post.category && (
                <Badge className="bg-accent text-accent-foreground">{post.category.name}</Badge>
              )}
              {post.publishedAt && (
                <time className="text-muted-foreground">
                  {format(post.publishedAt, "MMMM d, yyyy")}
                </time>
              )}
              <span className="text-muted-foreground">· {readingTime(post.content)}</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              {post.author ? (
                <p className="text-sm text-muted-foreground">
                  By <span className="font-medium text-foreground">{post.author.name}</span>
                </p>
              ) : (
                <span />
              )}
              <ShareButtons url={`${baseUrl}/blog/${post.slug}`} title={post.title} />
            </div>
          </div>
        </Container>
      </div>

      <Section>
        <div className="relative mx-auto max-w-3xl">
          {toc.length >= 3 && (
            <nav
              aria-label="Table of contents"
              className="absolute top-0 -left-60 hidden h-full w-52 text-sm xl:block"
            >
              <div className="sticky top-28">
                <p className="mb-3 font-medium">In this article</p>
                <ol className="space-y-1 border-l border-border">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className={`-ml-px block border-l border-transparent py-1 text-muted-foreground hover:border-accent hover:text-foreground ${t.level === 3 ? "pl-6" : "pl-3"}`}
                      >
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          )}
          {post.featuredImage && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {toc.length >= 3 && (
            <details className="mb-10 rounded-xl border border-border bg-secondary/50 p-5 xl:hidden">
              <summary className="cursor-pointer font-medium">In this article</summary>
              <ol className="mt-3 space-y-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                    <a href={`#${t.id}`} className="text-muted-foreground hover:text-foreground">{t.text}</a>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <RichText html={bodyHtml} className="max-w-none" />

          <div className="mt-14 rounded-2xl bg-secondary p-7">
            <p className="font-display text-xl font-semibold">Liked this? Get the next one by email.</p>
            <p className="mt-1 text-sm text-muted-foreground">Now and then. Unsubscribe whenever.</p>
            <NewsletterForm className="mt-4 max-w-md" />
          </div>

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-10">
            <Button render={<Link href="/blog" />} variant="ghost">
              <ArrowLeft className="size-4" />
              Back to all articles
            </Button>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="border-t border-border bg-secondary/50">
          <h2 className="font-display text-2xl font-bold">Related articles</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </Section>
      )}

      <CtaBanner />
    </>
  );
}
