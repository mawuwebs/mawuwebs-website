/** Pure date-range helpers for billing reports (UTC). No server-only imports so tests can load it. */

export const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

export const DAY = 864e5;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

/** Resolve a period to a UTC half-open range [from, to). Weeks start Monday. */
export function resolveRange(period: string | undefined, fromS?: string, toS?: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let key = (PERIODS.some((p) => p.key === period) ? period : "month") as PeriodKey;
  let from = today;
  let to = new Date(+today + DAY);
  if (key === "week") { from = new Date(+today - ((today.getUTCDay() + 6) % 7) * DAY); to = new Date(+from + 7 * DAY); }
  else if (key === "month") { from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)); }
  else if (key === "quarter") { const q = Math.floor(today.getUTCMonth() / 3) * 3; from = new Date(Date.UTC(today.getUTCFullYear(), q, 1)); to = new Date(Date.UTC(today.getUTCFullYear(), q + 3, 1)); }
  else if (key === "year") { from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1)); to = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)); }
  else if (key === "custom") {
    const f = parse(fromS), t = parse(toS);
    if (f && t && t >= f && +t - +f < 800 * DAY) { from = f; to = new Date(+t + DAY); }
    else {
      key = "month";
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    }
  }
  const days = Math.round((+to - +from) / DAY);
  return { key, from, to, days, bucket: (days > 62 ? "month" : "day") as "day" | "month", fromS: iso(from), toS: iso(new Date(+to - DAY)) };
}

export function seriesLabel(label: string, bucket: "day" | "month") {
  const d = new Date(`${label}${bucket === "month" ? "-01" : ""}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", bucket === "month" ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
}
