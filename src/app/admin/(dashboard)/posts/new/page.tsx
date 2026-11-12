import type { Metadata } from "next";
import { PostForm } from "@/components/admin/post-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New Blog Post" };

export default async function NewPostPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ where: { type: "POST" }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Blog Post</h1>
        <p className="mt-1 text-muted-foreground">Write a new article for your blog.</p>
      </div>
      <PostForm categories={categories} tags={tags} />
    </div>
  );
}
