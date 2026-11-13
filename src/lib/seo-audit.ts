import "server-only";
import { prisma } from "@/lib/prisma";

export type SeoIssue = { label: string; severity: "high" | "medium" | "low" };
export type SeoRow = {
  id: string;
  type: "Page" | "Post" | "Service" | "Project";
  title: string;
  editHref: string;
  noIndex: boolean;
  issues: SeoIssue[];
};

type Item = {
  id: string;
  title: string;
  content?: string | null;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noIndex: boolean;
};

const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

function auditItems(type: SeoRow["type"], base: string, items: Item[], dupTitles: Set<string>, dupDescs: Set<string>): SeoRow[] {
  return items.map((it) => {
    const issues: SeoIssue[] = [];
    const mt = it.metaTitle?.trim() ?? "";
    const md = it.metaDescription?.trim() ?? "";
    const html = it.content ?? "";

    if (!md) issues.push({ label: "No meta description", severity: "high" });
    else if (md.length < 70 || md.length > 160) issues.push({ label: `Meta description is ${md.length} chars (aim 120–160)`, severity: "medium" });
    if (!mt) issues.push({ label: "No meta title (page title is used)", severity: "low" });
    else if (mt.length > 60) issues.push({ label: `Meta title is ${mt.length} chars (max 60)`, severity: "medium" });
    if (mt && dupTitles.has(mt.toLowerCase())) issues.push({ label: "Duplicate meta title", severity: "high" });
    if (md && dupDescs.has(md.toLowerCase())) issues.push({ label: "Duplicate meta description", severity: "high" });
    if (!it.featuredImage) issues.push({ label: "No featured image (weak social previews)", severity: "low" });
    if (html) {
      const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
      const noAlt = imgs.filter((i) => !/\balt="[^"]+"/i.test(i)).length;
      if (noAlt) issues.push({ label: `${noAlt} image(s) without alt text`, severity: "medium" });
      if (/<h1\b/i.test(html)) issues.push({ label: "Content contains an H1 (the page title already is one)", severity: "medium" });
      if (type !== "Service" && words(html) < 300) issues.push({ label: `Thin content (${words(html)} words)`, severity: "low" });
      if (!/<a\b[^>]*href=/i.test(html)) issues.push({ label: "No links in content", severity: "low" });
    }
    return { id: it.id, type, title: it.title, editHref: `${base}/${it.id}`, noIndex: it.noIndex, issues };
  });
}

export async function runSeoAudit(): Promise<SeoRow[]> {
  const where = { deletedAt: null, status: "PUBLISHED" as const };
  const sel = { id: true, title: true, content: true, featuredImage: true, metaTitle: true, metaDescription: true, noIndex: true };
  const [pages, posts, services, projects] = await Promise.all([
    prisma.page.findMany({ where, select: sel }),
    prisma.post.findMany({ where, select: sel }),
    prisma.service.findMany({ where, select: sel }),
    prisma.project.findMany({ where, select: sel }),
  ]);

  const all = [...pages, ...posts, ...services, ...projects];
  const dup = (pick: (i: Item) => string | null) => {
    const seen = new Map<string, number>();
    for (const i of all) {
      const v = pick(i)?.trim().toLowerCase();
      if (v) seen.set(v, (seen.get(v) ?? 0) + 1);
    }
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  };
  const dt = dup((i) => i.metaTitle);
  const dd = dup((i) => i.metaDescription);

  return [
    ...auditItems("Page", "/admin/pages", pages, dt, dd),
    ...auditItems("Post", "/admin/posts", posts, dt, dd),
    ...auditItems("Service", "/admin/services", services, dt, dd),
    ...auditItems("Project", "/admin/projects", projects, dt, dd),
  ];
}
