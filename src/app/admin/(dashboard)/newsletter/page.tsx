import type { Metadata } from "next";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/list-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { prisma } from "@/lib/prisma";
import { deleteSubscriber } from "@/lib/actions/messages";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Newsletter</h1>
        <p className="mt-1 text-muted-foreground">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} signed up from your
          website.
        </p>
      </div>

      {subscribers.length === 0 ? (
        <EmptyState message="No subscribers yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.confirmedAt ? "Confirmed" : "Awaiting confirmation"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(s.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteButton itemLabel={s.email} action={deleteSubscriber.bind(null, s.id)} />
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
