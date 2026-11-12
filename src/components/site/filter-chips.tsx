import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterChip = { label: string; href: string; active: boolean };

/**
 * Link-based filter row. Scrolls sideways on phones instead of wrapping into
 * a tall block, keeps 44px touch targets, and exposes the current choice.
 */
export function FilterChips({ label, chips, className }: { label: string; chips: FilterChip[]; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0", className)}>
      <ul className="flex gap-2 sm:flex-wrap">
        {chips.map((chip) => (
          <li key={chip.href} className="shrink-0">
            <Link
              href={chip.href}
              scroll={false}
              aria-current={chip.active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:min-h-9",
                chip.active
                  ? "border-forest bg-forest text-white"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted"
              )}
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Showing 12 results" line + clear link, announced politely to screen readers. */
export function ResultSummary({
  count,
  noun,
  clearHref,
  query,
}: {
  count: number;
  noun: string;
  clearHref?: string;
  query?: string;
}) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
      <span>
        {count} {noun}
        {count === 1 ? "" : "s"}
        {query ? <> for &ldquo;{query}&rdquo;</> : null}
      </span>
      {clearHref && (
        <Link href={clearHref} className="font-medium text-accent underline underline-offset-4">
          Clear filters
        </Link>
      )}
    </p>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        href={actionHref}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-forest px-5 text-sm font-medium text-white hover:bg-forest-dark"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
