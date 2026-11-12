import { prisma } from "@/lib/prisma";

export async function getPublishedServices(opts?: { page?: number; pageSize?: number }) {
  return prisma.service.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
    ...(opts?.pageSize
      ? { skip: ((opts.page ?? 1) - 1) * opts.pageSize, take: opts.pageSize }
      : {}),
  });
}

export async function getPublishedServicesCount() {
  return prisma.service.count({ where: { status: "PUBLISHED" } });
}

export async function getFeaturedServices(limit = 3) {
  return prisma.service.findMany({
    where: { status: "PUBLISHED", featured: true },
    orderBy: { order: "asc" },
    take: limit,
  });
}

export async function getServiceBySlug(slug: string) {
  return prisma.service.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function getPublishedProjects(opts?: {
  category?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  return prisma.project.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts?.category ? { category: { slug: opts.category } } : {}),
    },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    include: { category: true, tags: true },
    take: opts?.pageSize ?? opts?.limit,
    ...(opts?.pageSize ? { skip: ((opts.page ?? 1) - 1) * opts.pageSize } : {}),
  });
}

export async function getPublishedProjectsCount(opts?: { category?: string }) {
  return prisma.project.count({
    where: {
      status: "PUBLISHED",
      ...(opts?.category ? { category: { slug: opts.category } } : {}),
    },
  });
}

export async function getFeaturedProjects(limit = 3) {
  return prisma.project.findMany({
    where: { status: "PUBLISHED", featured: true },
    orderBy: { order: "asc" },
    include: { category: true, tags: true },
    take: limit,
  });
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, tags: true },
  });
}

export async function getRelatedProjects(id: string, categoryId: string | null, limit = 3) {
  if (!categoryId) return [];
  return prisma.project.findMany({
    where: { status: "PUBLISHED", categoryId, id: { not: id } },
    include: { category: true, tags: true },
    take: limit,
  });
}

export async function getProjectCategories() {
  return prisma.category.findMany({
    where: { type: "PROJECT" },
    orderBy: { name: "asc" },
  });
}

function postsWhere(opts?: { category?: string; tag?: string; search?: string }) {
  return {
    status: "PUBLISHED" as const,
    ...(opts?.category ? { category: { slug: opts.category } } : {}),
    ...(opts?.tag ? { tags: { some: { slug: opts.tag } } } : {}),
    ...(opts?.search
      ? {
          OR: [
            { title: { contains: opts.search } },
            { excerpt: { contains: opts.search } },
            { content: { contains: opts.search } },
          ],
        }
      : {}),
  };
}

export async function getPublishedPosts(opts?: {
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  return prisma.post.findMany({
    where: postsWhere(opts),
    orderBy: { publishedAt: "desc" },
    include: { category: true, tags: true, author: true },
    take: opts?.pageSize ?? opts?.limit,
    ...(opts?.pageSize ? { skip: ((opts.page ?? 1) - 1) * opts.pageSize } : {}),
  });
}

export async function getPublishedPostsCount(opts?: {
  category?: string;
  tag?: string;
  search?: string;
}) {
  return prisma.post.count({ where: postsWhere(opts) });
}

export async function getFeaturedPost() {
  return prisma.post.findFirst({
    where: { status: "PUBLISHED", featured: true },
    orderBy: { publishedAt: "desc" },
    include: { category: true, tags: true, author: true },
  });
}

export async function getPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, tags: true, author: true },
  });
}

export async function getRelatedPosts(id: string, categoryId: string | null, limit = 3) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: id },
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    include: { category: true, tags: true },
    take: limit,
  });
}

export async function getPostCategories() {
  return prisma.category.findMany({
    where: { type: "POST" },
    orderBy: { name: "asc" },
  });
}

export async function getAllTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

export async function getPublishedTestimonials(limit?: number) {
  return prisma.testimonial.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
    take: limit,
  });
}

export async function getPublishedFaqs() {
  return prisma.faq.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });
}

export async function getPageBySlug(slug: string) {
  return prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function getNextProject(id: string) {
  const all = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    include: { category: true, tags: true },
  });
  if (all.length < 2) return null;
  const i = all.findIndex((p) => p.id === id);
  return all[(i + 1) % all.length];
}

export async function searchSite(q: string) {
  const term = q.trim();
  if (term.length < 2) return { services: [], projects: [], posts: [] };
  const [services, projects, posts] = await Promise.all([
    prisma.service.findMany({
      where: { status: "PUBLISHED", OR: [{ title: { contains: term } }, { description: { contains: term } }] },
      select: { title: true, slug: true, description: true },
      take: 4,
    }),
    prisma.project.findMany({
      where: { status: "PUBLISHED", OR: [{ title: { contains: term } }, { description: { contains: term } }, { client: { contains: term } }] },
      select: { title: true, slug: true, description: true },
      take: 4,
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", OR: [{ title: { contains: term } }, { excerpt: { contains: term } }] },
      select: { title: true, slug: true, excerpt: true },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);
  return { services, projects, posts };
}
