import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
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
import { auth } from "@/lib/auth";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 30;
import { deleteSubscriber } from "@/lib/actions/messages";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageParam } = await searchParams;
  const term = q.trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const where = term ? { email: { contains: term } } : {};
  const [session, subscribers, total, confirmed, unsubscribed] = await Promise.all([
    auth(),
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
  ]);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Newsletter</h1>
          <Link href="/admin/newsletter/send" className={buttonVariants({ size: "sm" })}>
            Send a newsletter
          </Link>
        </div>
        <p className="mt-1 text-muted-foreground">
          {confirmed} active subscriber{confirmed === 1 ? "" : "s"} from your website &middot; {unsubscribed} unsubscribed.
        </p>
      </div>

      <SearchBox placeholder="Search by email" className="max-w-sm" />

      {subscribers.length === 0 ? (
        <EmptyState message={term ? "No subscribers match that search." : "No subscribers yet."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed up from</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.unsubscribedAt ? `Unsubscribed ${format(s.unsubscribedAt, "MMM d, yyyy")}` : s.confirmedAt ? "Confirmed" : "Awaiting confirmation"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.source || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(s.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <DeleteButton itemLabel={s.email} action={deleteSubscriber.bind(null, s.id)} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Admin only</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination basePath="/admin/newsletter" params={{ q: term || undefined }} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
