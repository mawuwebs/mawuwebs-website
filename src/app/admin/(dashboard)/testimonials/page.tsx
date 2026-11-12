import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Star } from "lucide-react";
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
import { SearchBox } from "@/components/admin/search-box";
import { deleteTestimonial, toggleTestimonialStatus } from "@/lib/actions/testimonials";

export const metadata: Metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const testimonials = await prisma.testimonial.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { company: { contains: q } }, { content: { contains: q } }] } : {},
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Testimonials"
        description="Manage client testimonials shown across your site."
        newHref="/admin/testimonials/new"
        newLabel="New Testimonial"
      />

      <SearchBox placeholder="Search testimonials" className="max-w-sm" />

      {testimonials.length === 0 ? (
        <EmptyState message="No testimonials yet. Add your first one." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role}
                      {t.company ? `, ${t.company}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 text-yellow-dark">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PublishToggle
                      status={t.status}
                      action={toggleTestimonialStatus.bind(null, t.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/testimonials/${t.id}`} />}
                        aria-label={`Edit ${t.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton itemLabel={t.name} action={deleteTestimonial.bind(null, t.id)} />
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
