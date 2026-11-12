import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/project-form";
import { prisma } from "@/lib/prisma";
import { EditHeader, RevisionHistory } from "@/components/admin/edit-chrome";

export const metadata: Metadata = { title: "Edit Project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, categories, tags] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { tags: true } }),
    prisma.category.findMany({ where: { type: "PROJECT" }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <EditHeader type="project" id={project.id} heading="Edit Project" title={project.title} trashed={!!project.deletedAt} />
      {!project.deletedAt && <ProjectForm project={project} categories={categories} tags={tags} />}
      <RevisionHistory type="project" id={project.id} />
    </div>
  );
}
