import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Finds where each uploaded file is referenced (featured images, gallery JSON, rich-text bodies,
 * settings). A plain substring match on the URL: content is small, so one pass is cheap.
 */
export async function getMediaUsage(urls: string[]): Promise<Record<string, string[]>> {
  const usage: Record<string, string[]> = Object.fromEntries(urls.map((u) => [u, []]));
  if (urls.length === 0) return usage;

  const [posts, pages, projects, services, testimonials, settings, users] = await Promise.all([
    prisma.post.findMany({ where: { deletedAt: null }, select: { title: true, featuredImage: true, content: true } }),
    prisma.page.findMany({ select: { title: true, featuredImage: true, content: true } }),
    prisma.project.findMany({ select: { title: true, featuredImage: true, gallery: true, content: true } }),
    prisma.service.findMany({ select: { title: true, featuredImage: true, content: true } }),
    prisma.testimonial.findMany({ select: { name: true, avatar: true } }),
    prisma.siteSettings.findFirst({ select: { logo: true, heroImage: true } }),
    prisma.user.findMany({ select: { name: true, image: true } }),
  ]);

  const sources: { label: string; text: string }[] = [
    ...posts.map((p) => ({ label: `Post: ${p.title}`, text: `${p.featuredImage ?? ""}\n${p.content}` })),
    ...pages.map((p) => ({ label: `Page: ${p.title}`, text: `${p.featuredImage ?? ""}\n${p.content}` })),
    ...projects.map((p) => ({ label: `Project: ${p.title}`, text: `${p.featuredImage ?? ""}\n${p.gallery}\n${p.content}` })),
    ...services.map((p) => ({ label: `Service: ${p.title}`, text: `${p.featuredImage ?? ""}\n${p.content}` })),
    ...testimonials.map((t) => ({ label: `Testimonial: ${t.name}`, text: t.avatar ?? "" })),
    ...users.map((u) => ({ label: `User: ${u.name}`, text: u.image ?? "" })),
    ...(settings ? [{ label: "Site settings", text: `${settings.logo ?? ""}\n${settings.heroImage ?? ""}` }] : []),
  ];

  for (const url of urls) {
    for (const s of sources) if (s.text.includes(url)) usage[url].push(s.label);
  }
  return usage;
}
