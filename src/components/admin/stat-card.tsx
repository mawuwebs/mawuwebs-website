import Link from "next/link";
import { StatCountUp } from "@/components/site/stat-count-up";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 spotlight transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
    >
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold">{typeof value === "number" ? <StatCountUp value={String(value)} /> : value}</p>
      </div>
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="size-5" />
      </span>
    </Link>
  );
}
