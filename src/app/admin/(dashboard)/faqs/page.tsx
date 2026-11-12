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
import { SearchBox } from "@/components/admin/search-box";
import { deleteFaq, toggleFaqStatus } from "@/lib/actions/faqs";

export const metadata: Metadata = { title: "FAQs" };

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const faqs = await prisma.faq.findMany({
    where: q ? { OR: [{ question: { contains: q } }, { answer: { contains: q } }] } : {},
    orderBy: [{ category: "asc" }, { order: "asc" }] });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="FAQs"
        description="Manage frequently asked questions."
        newHref="/admin/faqs/new"
        newLabel="New FAQ"
      />

      <SearchBox placeholder="Search FAQs" className="max-w-sm" />

      {faqs.length === 0 ? (
        <EmptyState message="No FAQs yet. Add your first one." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="max-w-md font-medium">{faq.question}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{faq.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <PublishToggle status={faq.status} action={toggleFaqStatus.bind(null, faq.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/faqs/${faq.id}`} />}
                        aria-label="Edit FAQ"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton itemLabel={faq.question} action={deleteFaq.bind(null, faq.id)} />
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
