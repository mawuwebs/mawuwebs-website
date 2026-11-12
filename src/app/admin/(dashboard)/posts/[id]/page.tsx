import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/post-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Blog Post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, categories, tags] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { tags: true } }),
    prisma.category.findMany({ where: { type: "POST" }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Edit Blog Post</h1>
        <p className="mt-1 text-muted-foreground">{post.title}</p>
      </div>
      <PostForm post={post} categories={categories} tags={tags} />
    </div>
  );
}
