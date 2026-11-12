import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { DeleteButton } from "@/components/admin/delete-button";
import { prisma } from "@/lib/prisma";
import { deleteProject, toggleProjectStatus } from "@/lib/actions/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { order: "asc" },
    include: { category: true },
  });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Projects"
        description="Manage your portfolio of client work."
        newHref="/admin/projects/new"
        newLabel="New Project"
      />

      {projects.length === 0 ? (
        <EmptyState message="No projects yet. Create your first one." />
      ) : (
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
                    <PublishToggle
                      status={project.status}
                      action={toggleProjectStatus.bind(null, project.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {project.featured && <Badge variant="outline">Featured</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/projects/${project.id}`} />}
                        aria-label={`Edit ${project.title}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton
                        itemLabel={project.title}
                        action={deleteProject.bind(null, project.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
