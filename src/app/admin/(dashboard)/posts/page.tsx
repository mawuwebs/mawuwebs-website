import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { togglePostStatus } from "@/lib/actions/posts";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog Posts" };

const PAGE_SIZE = 20;
const TABS = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "TRASH", label: "Trash" },
] as const;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status = "", q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const now = new Date();
  const trash = status === "TRASH";

  const base: Prisma.PostWhereInput = trash ? { deletedAt: { not: null } } : { deletedAt: null };
  const byTab: Record<string, Prisma.PostWhereInput> = {
    PUBLISHED: { status: "PUBLISHED", OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
    DRAFT: { status: "DRAFT" },
    SCHEDULED: { status: "PUBLISHED", scheduledAt: { gt: now } },
  };
  const term = q.trim().slice(0, 100);
  const where: Prisma.PostWhereInput = {
    AND: [
      base,
      byTab[status] ?? {},
      term ? { OR: [{ title: { contains: term } }, { slug: { contains: term } }, { excerpt: { contains: term } }] } : {},
    ],
  };

  const [session, posts, total, trashCount] = await Promise.all([
    auth(),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: true, author: true },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.post.count({ where }),
    prisma.post.count({ where: { deletedAt: { not: null } } }),
  ]);
  const isAdmin = session?.user?.role === "ADMIN";

  const tabHref = (v: string) => {
    const p = new URLSearchParams();
    if (v) p.set("status", v);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/admin/posts${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Blog Posts"
        description="Write and manage articles for your blog."
        newHref="/admin/posts/new"
        newLabel="New Blog Post"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={tabHref(t.value)}
              aria-current={status === t.value ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                status === t.value ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
              )}
            >
              {t.label}
              {t.value === "TRASH" && trashCount > 0 ? ` (${trashCount})` : ""}
            </Link>
          ))}
        </div>
        <SearchBox placeholder="Search posts" className="w-full sm:w-72" />
      </div>

      {posts.length === 0 ? (
        <EmptyState
          message={
            term || status
              ? trash && !term
                ? "The trash is empty."
                : "No posts match these filters."
              : "No blog posts yet. Write your first one."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{trash ? "Deleted" : "Updated"}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const scheduled = post.status === "PUBLISHED" && post.scheduledAt && post.scheduledAt > now;
                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{post.title}</p>
                          {post.featured && <Badge variant="outline">Featured</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">/{post.slug}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{post.author?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{post.category?.name ?? "—"}</TableCell>
                      <TableCell>
                        {trash ? (
                          <span className="text-sm text-muted-foreground">In trash</span>
                        ) : scheduled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                            <CalendarClock className="size-3" />
                            {format(post.scheduledAt!, "MMM d, h:mm a")}
                          </span>
                        ) : (
                          <PublishToggle status={post.status} action={togglePostStatus.bind(null, post.id)} />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(trash && post.deletedAt ? post.deletedAt : post.updatedAt, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <ContentRowActions type="post" id={post.id} title={post.title} editHref={`/admin/posts/${post.id}`} trashed={trash} isAdmin={isAdmin} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            basePath="/admin/posts"
            params={{ status: status || undefined, q: term || undefined }}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </div>
  );
}
