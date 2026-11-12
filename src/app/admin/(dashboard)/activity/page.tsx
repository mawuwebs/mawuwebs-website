import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/list-page-header";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity Log" };

const PAGE_SIZE = 30;
const ACTION_STYLES: Record<string, string> = {
  created: "border-success/30 bg-success/10 text-success",
  updated: "border-accent/30 bg-accent/10 text-accent",
  deleted: "border-destructive/30 bg-destructive/10 text-destructive",
  published: "border-success/30 bg-success/10 text-success",
  unpublished: "border-muted-foreground/30 bg-muted text-muted-foreground",
  replied: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  restored: "border-success/30 bg-success/10 text-success",
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string; page?: string }>;
}) {
  const { action = "", q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const term = q.trim().slice(0, 100);

  const where: Prisma.ActivityLogWhereInput = {
    ...(action in ACTION_STYLES ? { action } : {}),
    ...(term ? { OR: [{ message: { contains: term } }, { entityType: { contains: term } }] } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: true },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const href = (a: string) => {
    const p = new URLSearchParams();
    if (a) p.set("action", a);
    if (term) p.set("q", term);
    const s = p.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
      active ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Activity Log</h1>
        <p className="mt-1 text-muted-foreground">A record of changes made across your site.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by action">
          <Link href={href("")} className={pill(!action)}>
            All
          </Link>
          {Object.keys(ACTION_STYLES).map((a) => (
            <Link key={a} href={href(a)} className={pill(action === a)}>
              {a}
            </Link>
          ))}
        </div>
        <SearchBox placeholder="Search activity" className="w-full sm:w-72" />
      </div>

      {logs.length === 0 ? (
        <EmptyState message={action || term ? "No activity matches these filters." : "No activity recorded yet."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" className={cn(ACTION_STYLES[log.action])}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell className="text-muted-foreground">{log.user?.name ?? "System"}</TableCell>
                    <TableCell className="text-muted-foreground">{format(log.createdAt, "MMM d, yyyy h:mm a")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            basePath="/admin/activity"
            params={{ action: action || undefined, q: term || undefined }}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </div>
  );
}
