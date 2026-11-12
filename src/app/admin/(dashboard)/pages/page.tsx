import type { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { ContentStatusCell } from "@/components/admin/content-status-cell";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListToolbar, parseListParams, statusWhere } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 25;
import { togglePageStatus } from "@/lib/actions/pages";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const list = parseListParams(await searchParams, PAGE_SIZE);
  const where = {
    AND: [
      statusWhere(list.status),
      list.q ? { OR: [{ title: { contains: list.q } }, { slug: { contains: list.q } }] } : {},
    ],
  };
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: list.take,
      skip: list.skip,
    }),
    prisma.page.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Pages"
        description="Manage flexible content pages like About, Privacy Policy, and Terms."
        newHref="/admin/pages/new"
        newLabel="New Page"
      />

      <ListToolbar basePath="/admin/pages" status={list.status} q={list.q} searchLabel="Search pages" />

      {pages.length === 0 ? (
        <EmptyState message={list.q || list.status ? "Nothing matches these filters." : "No pages yet. Create your first one."} />
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <p className="font-medium">{page.title}</p>
                    <p className="text-xs text-muted-foreground">/{page.slug}</p>
                  </TableCell>
                  <TableCell>
                    <ContentStatusCell status={page.status} scheduledAt={page.scheduledAt} deletedAt={page.deletedAt} toggle={togglePageStatus.bind(null, page.id)} />
                  </TableCell>
                  <TableCell>
                    <ContentRowActions type="page" id={page.id} title={page.title} editHref={`/admin/pages/${page.id}`} trashed={list.status === "TRASH"} isAdmin={isAdmin} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination basePath="/admin/pages" params={{ status: list.status || undefined, q: list.q || undefined }} page={list.page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
