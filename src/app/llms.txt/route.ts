import { prisma } from "@/lib/prisma";
import { live, livePost } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Plain-text site summary for AI assistants (see llmstxt.org). */
export async function GET() {
  const base = siteUrl();
  const [settings, services, posts, pages] = await Promise.all([
    getSiteSettings(),
    prisma.service.findMany({ where: { ...live(), noIndex: false }, orderBy: { order: "asc" }, select: { title: true, slug: true, description: true } }),
    prisma.post.findMany({ where: { ...livePost(), noIndex: false }, orderBy: { publishedAt: "desc" }, take: 20, select: { title: true, slug: true, excerpt: true } }),
    prisma.page.findMany({ where: { ...live(), noIndex: false }, select: { title: true, slug: true } }),
  ]);

  const line = (t: string, u: string, d?: string) => `- [${t}](${base}${u})${d ? `: ${d.replace(/\s+/g, " ").slice(0, 160)}` : ""}`;
  const body = [
    `# ${settings.siteName}`,
    "",
    `> ${settings.tagline}. ${settings.footerText}`,
    "",
    "## Services",
    ...services.map((s) => line(s.title, `/services/${s.slug}`, s.description)),
    "",
    "## Pages",
    ...pages.map((p) => line(p.title, `/${p.slug}`)),
    "",
    "## Articles",
    ...posts.map((p) => line(p.title, `/blog/${p.slug}`, p.excerpt)),
    "",
    "## Contact",
    `- Email: ${settings.contactEmail}`,
    `- Phone: ${settings.phone}`,
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
