import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2 || series.every((n) => n === 0)) {
    return <div className="h-10 border-b border-dashed border-border" aria-hidden />;
  }
  const w = 120;
  const h = 40;
  const pad = 3;
  const max = Math.max(...series, 1);
  const pts = series.map((n, i) => [
    (i / (series.length - 1)) * w,
    h - pad - (n / max) * (h - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="var(--accent)" opacity="0.1" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Change vs the previous window. Direction is shown with an arrow and a sign, never colour alone. */
function Delta({
  value,
  previous,
  lowerIsBetter,
  rangeLabel,
}: {
  value: number | null;
  previous: number | null;
  lowerIsBetter?: boolean;
  rangeLabel: string;
}) {
  if (value === null || previous === null || (previous === 0 && value === 0)) {
    return <span className="text-xs text-muted-foreground">No change data yet</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-muted-foreground">New in the last {rangeLabel}</span>;
  }
  const pct = Math.round(((value - previous) / previous) * 100);
  const Icon = pct === 0 ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  const good = pct === 0 ? null : lowerIsBetter ? pct < 0 : pct > 0;
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
          good === null && "bg-muted text-muted-foreground",
          good === true && "bg-success/10 text-success",
          good === false && "bg-destructive/10 text-destructive"
        )}
      >
        <Icon className="size-3" />
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
      <span className="text-muted-foreground">vs previous {rangeLabel}</span>
    </span>
  );
}

export function KpiCard({
  label,
  display,
  href,
  icon: Icon,
  value,
  previous,
  series,
  lowerIsBetter,
  rangeLabel,
}: {
  label: string;
  display: string;
  href: string;
  icon: LucideIcon;
  value: number | null;
  previous: number | null;
  series: number[];
  lowerIsBetter?: boolean;
  rangeLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-3xl leading-none font-bold tabular-nums">{display}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <Sparkline series={series} />
      <Delta value={value} previous={previous} lowerIsBetter={lowerIsBetter} rangeLabel={rangeLabel} />
    </Link>
  );
}
