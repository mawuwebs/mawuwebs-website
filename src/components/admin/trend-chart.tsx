"use client";

import { formatMoney } from "@/lib/billing";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; prevLabel?: string; current: number; previous?: number };

function Tip({
  active,
  payload,
  name,
  prevName,
  fmt,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  name: string;
  prevName: string;
  fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{p.label}</p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full bg-accent" />
        {name}: <span className="font-medium text-foreground tabular-nums">{fmt(p.current)}</span>
      </p>
      {p.previous !== undefined && (
        <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
          <span className="h-0 w-2 border-t-2 border-dashed border-muted-foreground" />
          {prevName} ({p.prevLabel}): <span className="font-medium text-foreground tabular-nums">{fmt(p.previous)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * One measure over time, optionally against the previous period (dashed, muted).
 * Crosshair + tooltip on hover; a collapsible table carries the same numbers for screen readers.
 */
export function TrendChart({
  data,
  name,
  prevName = "Previous period",
  showPrevious = false,
  height = 240,
  fitY = false,
  currency,
}: {
  data: Point[];
  name: string;
  prevName?: string;
  showPrevious?: boolean;
  height?: number;
  /** Zoom the y-axis to the data range; use for cumulative series that never start at zero. */
  fitY?: boolean;
  /** When set, values are money in minor units of this currency. */
  currency?: string;
}) {
  const fmt = (n: number) => (currency ? formatMoney(n, currency) : String(n));
  const total = data.reduce((a, d) => a + d.current, 0);
  const every = Math.max(0, Math.ceil(data.length / 7) - 1);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" />
          {name}
        </span>
        {showPrevious && (
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-muted-foreground" />
            {prevName}
          </span>
        )}
      </div>
      <div role="img" aria-label={`${name} over ${data.length} days, ${fmt(total)} in total`} style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              interval={every}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              minTickGap={16}
            />
            <YAxis width={currency ? 56 : undefined} tickFormatter={currency ? (n: number) => formatMoney(n, currency).replace(/\.00$/, "") : undefined} allowDecimals={false} domain={fitY ? ["dataMin - 1", "dataMax + 1"] : [0, "auto"]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={<Tip name={name} prevName={prevName} fmt={fmt} active={undefined} payload={undefined} />}
            />
            {showPrevious && (
              <Line
                dataKey="previous"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              dataKey="current"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="var(--accent)"
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--card)", strokeWidth: 2 }}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">View as table</summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-secondary text-foreground">
              <tr>
                <th className="px-3 py-1.5 font-medium">Date</th>
                <th className="px-3 py-1.5 font-medium">{name}</th>
                {showPrevious && <th className="px-3 py-1.5 font-medium">{prevName}</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-border">
                  <td className="px-3 py-1">{d.label}</td>
                  <td className="px-3 py-1 tabular-nums">{fmt(d.current)}</td>
                  {showPrevious && <td className="px-3 py-1 tabular-nums">{d.previous === undefined ? "" : fmt(d.previous)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
