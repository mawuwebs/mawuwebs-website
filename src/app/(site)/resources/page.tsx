import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { BlogCard } from "@/components/site/blog-card";
import { CtaBanner } from "@/components/site/cta-banner";
import { getPublishedPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Resources",
  description: "Free tools and guides for planning, building and launching a website.",
};

const TOOLS = [
  {
    href: "/estimate",
    title: "Project estimator",
    body: "Four questions to see roughly how big your website or app project is, and how long it usually takes.",
    tag: "Interactive",
  },
  {
    href: "/resources/website-launch-checklist",
    title: "Website launch checklist",
    body: "More than twenty things that get forgotten on launch day, with progress saved as you go.",
    tag: "Checklist",
  },
  {
    href: "/faq",
    title: "Questions we get asked",
    body: "Timelines, costs, ownership, maintenance. Straight answers.",
    tag: "FAQ",
  },
];

export default async function ResourcesPage() {
  const posts = await getPublishedPosts({ limit: 3 });
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Tools for planning a website"
        description="Free, no sign-up needed."
      />
      <Section>
        <ul className="border-b border-border">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="group grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-border py-8 transition-colors hover:bg-secondary/60 sm:px-2"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{t.tag}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{t.title}</h2>
                  <p className="mt-2 max-w-xl text-muted-foreground">{t.body}</p>
                </div>
                <ArrowUpRight className="size-6 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      {posts.length > 0 && (
        <Section className="border-t border-border pt-16">
          <h2 className="font-display text-3xl font-semibold">Latest articles</h2>
          <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </Section>
      )}
      <CtaBanner />
    </>
  );
}
