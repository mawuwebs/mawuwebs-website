import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/post-form";
import { prisma } from "@/lib/prisma";
import { EditHeader, RevisionHistory } from "@/components/admin/edit-chrome";

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
      <EditHeader type="post" id={post.id} heading="Edit Blog Post" title={post.title} trashed={!!post.deletedAt} />
      {!post.deletedAt && <PostForm post={post} categories={categories} tags={tags} />}
      <RevisionHistory type="post" id={post.id} />
    </div>
  );
}
