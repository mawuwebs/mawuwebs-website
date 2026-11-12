import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BellRing, ArrowRight, Inbox } from "lucide-react";
import { KIND_LABEL, type SubmissionKind } from "@/lib/submission";
import { cn } from "@/lib/utils";

type Summary = {
  total: number;
  byKind: Record<string, number>;
  urgent: number;
  overdue: number;
  overdueHours: number;
  latest: { id: string; name: string; createdAt: Date } | null;
};

/** Banner for new service orders. Loud when something is waiting, quiet link when not. */
export function OrdersAlert({ summary, className }: { summary: Summary; className?: string }) {
  if (summary.total === 0) {
    return (
      <Link
        href="/admin/messages"
        className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", className)}
      >
        <Inbox className="size-4" aria-hidden /> No new orders. View all orders
      </Link>
    );
  }
  const parts = Object.entries(summary.byKind)
    .map(([k, n]) => `${n} ${KIND_LABEL[k as SubmissionKind].toLowerCase()}${n === 1 ? "" : "s"}`)
    .join(", ");
  const hot = summary.urgent > 0 || summary.overdue > 0;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        hot ? "border-destructive/40 bg-destructive/10" : "border-accent/40 bg-accent/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <BellRing className={cn("mt-0.5 size-5 shrink-0 animate-pulse", hot ? "text-destructive" : "text-accent")} aria-hidden />
        <div>
          <p className="font-semibold">
            {summary.total} order{summary.total === 1 ? "" : "s"} waiting for a reply
            {summary.urgent > 0 && <span className="text-destructive"> &middot; {summary.urgent} urgent, work stopped</span>}
            {summary.overdue > 0 && (
              <span className="text-destructive"> &middot; {summary.overdue} waiting over {summary.overdueHours}h</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {parts}
            {summary.latest && <> &middot; latest from {summary.latest.name} {formatDistanceToNow(summary.latest.createdAt, { addSuffix: true })}</>}
          </p>
        </div>
      </div>
      <Link
        href="/admin/messages?status=NEW"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        View orders <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
