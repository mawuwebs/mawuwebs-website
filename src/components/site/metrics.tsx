import type { Metric } from "@/lib/settings";
import { StatCountUp } from "@/components/site/stat-count-up";
import { cn } from "@/lib/utils";

export function Metrics({
  metrics,
  bare = false,
}: {
  metrics: Metric[];
  bare?: boolean;
}) {
  if (metrics.length === 0) return null;
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:divide-x sm:divide-border",
        !bare && "rounded-3xl border border-border bg-secondary/50 px-6 py-10 sm:px-4"
      )}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col items-center text-center sm:px-6"
        >
          <dd className="order-1 font-display text-4xl font-bold text-primary sm:text-5xl">
            <StatCountUp value={metric.value} />
          </dd>
          <dt className="order-2 mt-2 text-sm text-muted-foreground">{metric.label}</dt>
        </div>
      ))}
    </dl>
  );
}
