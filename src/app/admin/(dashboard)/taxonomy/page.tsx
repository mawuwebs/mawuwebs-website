import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/list-page-header";
import { AddTaxonomyForm } from "@/components/admin/add-taxonomy-form";
import { TaxonomyItemRow } from "@/components/admin/taxonomy-item-row";
import { prisma } from "@/lib/prisma";
import {
  createCategory,
  createTag,
  renameCategory,
  renameTag,
  deleteCategory,
  deleteTag,
} from "@/lib/actions/taxonomy";

export const metadata: Metadata = { title: "Categories & Tags" };

export default async function TaxonomyPage() {
  const [postCategories, projectCategories, tags] = await Promise.all([
    prisma.category.findMany({
      where: { type: "POST" },
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.category.findMany({
      where: { type: "PROJECT" },
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true, projects: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Categories &amp; Tags</h1>
        <p className="mt-1 text-muted-foreground">
          Organize your blog posts and portfolio projects.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="font-display font-semibold">Blog Categories</h2>
            <p className="text-xs text-muted-foreground">Used to organize blog posts.</p>
          </div>
          <AddTaxonomyForm
            action={createCategory}
            placeholder="New category name"
            hiddenFields={{ type: "POST" }}
          />
          <div className="space-y-2">
            {postCategories.map((cat) => (
              <TaxonomyItemRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                meta={`${cat._count.posts} post${cat._count.posts === 1 ? "" : "s"}`}
                onRename={renameCategory}
                onDelete={deleteCategory}
              />
            ))}
            {postCategories.length === 0 && <EmptyState message="No blog categories yet." />}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="font-display font-semibold">Portfolio Categories</h2>
            <p className="text-xs text-muted-foreground">Used to filter portfolio projects.</p>
          </div>
          <AddTaxonomyForm
            action={createCategory}
            placeholder="New category name"
            hiddenFields={{ type: "PROJECT" }}
          />
          <div className="space-y-2">
            {projectCategories.map((cat) => (
              <TaxonomyItemRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                meta={`${cat._count.projects} project${cat._count.projects === 1 ? "" : "s"}`}
                onRename={renameCategory}
                onDelete={deleteCategory}
              />
            ))}
            {projectCategories.length === 0 && <EmptyState message="No portfolio categories yet." />}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="font-display font-semibold">Tags</h2>
            <p className="text-xs text-muted-foreground">Shared between posts and projects.</p>
          </div>
          <AddTaxonomyForm action={createTag} placeholder="New tag name" />
          <div className="space-y-2">
            {tags.map((tag) => (
              <TaxonomyItemRow
                key={tag.id}
                id={tag.id}
                name={tag.name}
                meta={`${tag._count.posts + tag._count.projects} uses`}
                onRename={renameTag}
                onDelete={deleteTag}
              />
            ))}
            {tags.length === 0 && <EmptyState message="No tags yet." />}
          </div>
        </div>
      </div>
    </div>
  );
}
