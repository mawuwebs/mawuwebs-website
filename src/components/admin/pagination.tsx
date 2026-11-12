import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pager. Keeps every other query param intact. */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "inline-flex size-9 items-center justify-center rounded-lg border border-border transition-colors";

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(btn, "hover:bg-secondary")} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-hidden>
            <ChevronLeft className="size-4" />
          </span>
        )}
        <span className="px-1">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className={cn(btn, "hover:bg-secondary")} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-hidden>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
