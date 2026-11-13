import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { live, livePost } from "@/lib/content";
import { INDUSTRIES } from "@/lib/industries";
import { SYSTEM_PAGE_SLUGS } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  const [pages, services, projects, posts] = await Promise.all([
    prisma.page.findMany({
      where: { ...live(), noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.service.findMany({
      where: { ...live(), noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { ...live(), noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: { ...livePost(), noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const pageDates = new Map(pages.map((p) => [p.slug, p.updatedAt]));
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/services",
    "/portfolio",
    "/blog",
    "/contact",
    "/faq",
    "/start-a-project",
    "/support",
    "/plans",
    "/plans/enquire",
    "/estimate",
    "/resources",
    "/resources/website-launch-checklist",
    "/resources/it-toolkit",
    "/it-health-check",
    "/book-a-call",
    ...INDUSTRIES.map((i) => `/it-for/${i.slug}`),
    "/resources/it-downtime-calculator",
    "/privacy-policy",
    "/terms-of-service",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: pageDates.get(path.slice(1)),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...pages
      .filter((p) => !SYSTEM_PAGE_SLUGS.includes(p.slug))
      .map((p) => ({
        url: `${baseUrl}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ...services.map((s) => ({
      url: `${baseUrl}/services/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...projects.map((p) => ({
      url: `${baseUrl}/portfolio/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
