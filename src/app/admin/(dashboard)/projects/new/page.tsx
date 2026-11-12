import type { Metadata } from "next";
import { ProjectForm } from "@/components/admin/project-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New Project" };

export default async function NewProjectPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ where: { type: "PROJECT" }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Project</h1>
        <p className="mt-1 text-muted-foreground">Add a new project to your portfolio.</p>
      </div>
      <ProjectForm categories={categories} tags={tags} />
    </div>
  );
}
