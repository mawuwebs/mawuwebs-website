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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/list-page-header";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity Log" };

const ACTION_STYLES: Record<string, string> = {
  created: "border-success/30 bg-success/10 text-success",
  updated: "border-accent/30 bg-accent/10 text-accent",
  deleted: "border-destructive/30 bg-destructive/10 text-destructive",
  published: "border-success/30 bg-success/10 text-success",
  unpublished: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default async function ActivityLogPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Activity Log</h1>
        <p className="mt-1 text-muted-foreground">
          A record of content changes made across your site.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState message="No activity recorded yet." />
      ) : (
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
                  <TableCell className="text-muted-foreground">
                    {log.user?.name ?? "System"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(log.createdAt, "MMM d, yyyy h:mm a")}
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
