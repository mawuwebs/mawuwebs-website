import Link from "next/link";
import { cn } from "@/lib/utils";

export type BarItem = { label: string; value: number; href?: string; tone?: "default" | "good" | "bad" };

/** Horizontal bars with the value always written out, so colour is never the only signal. */
export function BarList({ items, emptyText = "Nothing to show yet." }: { items: BarItem[]; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{it.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{it.value}</span>
                {total > 0 && <span className="ml-1.5 text-xs">{Math.round((it.value / total) * 100)}%</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  it.tone === "good" ? "bg-success" : it.tone === "bad" ? "bg-destructive/70" : "bg-accent"
                )}
                style={{ width: `${(it.value / max) * 100}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={it.label}>
            {it.href ? (
              <Link href={it.href} className="block rounded-md transition-colors hover:bg-secondary/50">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
