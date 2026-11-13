"use server";

import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { live } from "@/lib/content";

export type LinkTarget = { label: string; url: string; group: string };

/** Everything an editor can link to inside the site. */
export async function listLinkTargets(): Promise<LinkTarget[]> {
  await requireArea("content");
  const sel = { title: true, slug: true } as const;
  const [pages, services, posts, projects] = await Promise.all([
    prisma.page.findMany({ where: live(), select: sel }),
    prisma.service.findMany({ where: live(), select: sel }),
    prisma.post.findMany({ where: live(), select: sel, orderBy: { publishedAt: "desc" }, take: 100 }),
    prisma.project.findMany({ where: live(), select: sel }),
  ]);
  const fixed: LinkTarget[] = [
    ["Home", "/"],
    ["Services", "/services"],
    ["Portfolio", "/portfolio"],
    ["Blog", "/blog"],
    ["Plans", "/plans"],
    ["Contact", "/contact"],
    ["Start a project", "/start-a-project"],
    ["FAQ", "/faq"],
  ].map(([label, url]) => ({ label, url, group: "Site" }));
  return [
    ...fixed,
    ...pages.map((p) => ({ label: p.title, url: `/${p.slug}`, group: "Pages" })),
    ...services.map((p) => ({ label: p.title, url: `/services/${p.slug}`, group: "Services" })),
    ...projects.map((p) => ({ label: p.title, url: `/portfolio/${p.slug}`, group: "Projects" })),
    ...posts.map((p) => ({ label: p.title, url: `/blog/${p.slug}`, group: "Blog posts" })),
  ];
}

export type PickerMedia = { id: string; url: string; alt: string; filename: string };

export async function listMediaForPicker(): Promise<PickerMedia[]> {
  await requireArea("content");
  return prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, alt: true, filename: true },
  });
}
