import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      <Link
        href={buildHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg border border-border text-sm transition-all hover:-translate-y-0.5 hover:bg-muted",
          currentPage === 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">Previous page</span>
      </Link>

      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-all hover:-translate-y-0.5",
            page === currentPage
              ? "border-forest bg-forest text-white"
              : "border-border hover:bg-muted"
          )}
        >
          {page}
        </Link>
      ))}

      <Link
        href={buildHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg border border-border text-sm transition-all hover:-translate-y-0.5 hover:bg-muted",
          currentPage === totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Next page</span>
      </Link>
    </nav>
  );
}
