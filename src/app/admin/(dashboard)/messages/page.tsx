import type { Metadata } from "next";
import Link from "next/link";
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
import { MessageDetailDialog } from "@/components/admin/message-detail-dialog";
import { prisma } from "@/lib/prisma";
import { STATUS_OPTIONS, submissionKind, KIND_LABEL } from "@/lib/submission";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { status, type } = await searchParams;
  const all = await prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });

  const counts: Record<string, number> = {};
  for (const s of all) counts[s.status] = (counts[s.status] ?? 0) + 1;

  const submissions = all.filter(
    (s) =>
      (!status || s.status === status) &&
      (!type || submissionKind(s.subject) === type)
  );

  const href = (next: { status?: string; type?: string }) => {
    const q = new URLSearchParams();
    const st = "status" in next ? next.status : status;
    const ty = "type" in next ? next.type : type;
    if (st) q.set("status", st);
    if (ty) q.set("type", ty);
    const qs = q.toString();
    return `/admin/messages${qs ? `?${qs}` : ""}`;
  };

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Enquiries</h1>
        <p className="mt-1 text-muted-foreground">
          Project briefs, estimates and messages from your website, with a simple pipeline.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="Filter by status">
          <Link href={href({ status: undefined })} className={pill(!status)}>
            All ({all.length})
          </Link>
          {STATUS_OPTIONS.map((o) => (
            <Link key={o.value} href={href({ status: o.value })} className={pill(status === o.value)}>
              {o.label} ({counts[o.value] ?? 0})
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filter by type">
          <Link href={href({ type: undefined })} className={pill(!type)}>
            Any type
          </Link>
          {(["support", "brief", "estimate", "message"] as const).map((k) => (
            <Link key={k} href={href({ type: k })} className={pill(type === k)}>
              {KIND_LABEL[k]}
            </Link>
          ))}
        </div>
      </div>

      {submissions.length === 0 ? (
        <EmptyState message="Nothing matches these filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => {
                const opt = STATUS_OPTIONS.find((o) => o.value === s.status);
                const kind = submissionKind(s.subject);
                return (
                  <TableRow key={s.id} className={cn(s.status === "NEW" && "bg-accent/5")}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {KIND_LABEL[kind]}
                      {kind === "message" && s.subject ? (
                        <span className="block max-w-[14rem] truncate text-xs">{s.subject}</span>
                      ) : null}
                      {s.notes && <span className="block text-xs text-accent">Has notes</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(s.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", opt?.style)}>
                        {opt?.label ?? s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <MessageDetailDialog submission={s} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
