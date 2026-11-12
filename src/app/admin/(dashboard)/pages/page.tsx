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
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { DeleteButton } from "@/components/admin/delete-button";
import { prisma } from "@/lib/prisma";
import { deletePage, togglePageStatus } from "@/lib/actions/pages";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Pages"
        description="Manage flexible content pages like About, Privacy Policy, and Terms."
        newHref="/admin/pages/new"
        newLabel="New Page"
      />

      {pages.length === 0 ? (
        <EmptyState message="No pages yet. Create your first one." />
      ) : (
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
                    <PublishToggle
                      status={page.status}
                      action={togglePageStatus.bind(null, page.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/pages/${page.id}`} />}
                        aria-label={`Edit ${page.title}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton itemLabel={page.title} action={deletePage.bind(null, page.id)} />
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
