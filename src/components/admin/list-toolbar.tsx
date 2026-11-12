import Link from "next/link";
import { SearchBox } from "@/components/admin/search-box";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "TRASH", label: "Trash" },
] as const;

/** Status tabs + search for content lists. State lives in the URL (?status=&q=). */
export function ListToolbar({
  basePath,
  status,
  q,
  searchLabel,
}: {
  basePath: string;
  status: string;
  q: string;
  searchLabel: string;
}) {
  const href = (v: string) => {
    const p = new URLSearchParams();
    if (v) p.set("status", v);
    if (q) p.set("q", q);
    const s = p.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={href(t.value)}
            aria-current={status === t.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              status === t.value ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <SearchBox placeholder={searchLabel} className="w-full sm:w-72" />
    </div>
  );
}

export function parseListParams(p: { status?: string; q?: string; page?: string }, pageSize: number) {
  const status = ["PUBLISHED", "DRAFT", "SCHEDULED", "TRASH"].includes(p.status ?? "") ? (p.status as string) : "";
  const q = (p.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(p.page ?? "1", 10) || 1);
  return { status, q, page, take: pageSize, skip: (page - 1) * pageSize };
}

/** Prisma filter for a status tab. Everything except Trash hides trashed items. */
export function statusWhere(status: string) {
  const now = new Date();
  switch (status) {
    case "TRASH":
      return { deletedAt: { not: null } };
    case "DRAFT":
      return { deletedAt: null, status: "DRAFT" as const };
    case "SCHEDULED":
      return { deletedAt: null, status: "PUBLISHED" as const, scheduledAt: { gt: now } };
    case "PUBLISHED":
      return { deletedAt: null, status: "PUBLISHED" as const, OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] };
    default:
      return { deletedAt: null };
  }
}
