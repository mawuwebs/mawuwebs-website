import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
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
import { deletePost, togglePostStatus } from "@/lib/actions/posts";

export const metadata: Metadata = { title: "Blog Posts" };

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, author: true },
  });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Blog Posts"
        description="Write and manage articles for your blog."
        newHref="/admin/posts/new"
        newLabel="New Blog Post"
      />

      {posts.length === 0 ? (
        <EmptyState message="No blog posts yet. Write your first one." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{post.title}</p>
                      {post.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">/{post.slug}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.author?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.category?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <PublishToggle
                      status={post.status}
                      action={togglePostStatus.bind(null, post.id)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(post.updatedAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/posts/${post.id}`} />}
                        aria-label={`Edit ${post.title}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton itemLabel={post.title} action={deletePost.bind(null, post.id)} />
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
