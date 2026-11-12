import type { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { ContentStatusCell } from "@/components/admin/content-status-cell";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListToolbar, parseListParams, statusWhere } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 25;
import { toggleProjectStatus } from "@/lib/actions/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const list = parseListParams(await searchParams, PAGE_SIZE);
  const where = {
    AND: [
      statusWhere(list.status),
      list.q ? { OR: [{ title: { contains: list.q } }, { slug: { contains: list.q } }, { client: { contains: list.q } }] } : {},
    ],
  };
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { order: "asc" },
      include: { category: true },
      take: list.take,
      skip: list.skip,
    }),
    prisma.project.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Projects"
        description="Manage your portfolio of client work."
        newHref="/admin/projects/new"
        newLabel="New Project"
      />

      <ListToolbar basePath="/admin/projects" status={list.status} q={list.q} searchLabel="Search projects" />

      {projects.length === 0 ? (
        <EmptyState message={list.q || list.status ? "Nothing matches these filters." : "No projects yet. Create your first one."} />
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <p className="font-medium">{project.title}</p>
                    <p className="text-xs text-muted-foreground">/{project.slug}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.category?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ContentStatusCell status={project.status} scheduledAt={project.scheduledAt} deletedAt={project.deletedAt} toggle={toggleProjectStatus.bind(null, project.id)} />
                  </TableCell>
                  <TableCell>
                    {project.featured && <Badge variant="outline">Featured</Badge>}
                  </TableCell>
                  <TableCell>
                    <ContentRowActions type="project" id={project.id} title={project.title} editHref={`/admin/projects/${project.id}`} trashed={list.status === "TRASH"} isAdmin={isAdmin} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination basePath="/admin/projects" params={{ status: list.status || undefined, q: list.q || undefined }} page={list.page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
