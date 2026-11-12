import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { live, livePost } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

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
    "/privacy-policy",
    "/terms-of-service",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [services, projects, posts] = await Promise.all([
    prisma.service.findMany({
      where: live(),
      select: { slug: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: live(),
      select: { slug: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: livePost(),
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const dynamicRoutes: MetadataRoute.Sitemap = [
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
