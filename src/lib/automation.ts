/**
 * Pure rules for the renewal, quote follow-up and uptime crons. No server-only imports so they are unit-testable.
 */
const DAY = 86_400_000;

/** Quotes still unanswered this many days after sending get one follow-up email. */
export const QUOTE_NUDGE_DAYS = 5;

/**
 * Renewal notice level an item has reached: 0 = nothing due yet, 1 = within 30 days, 2 = within 7 days, 3 = expired.
 * The cron sends a notice only when this is higher than the stage already recorded.
 */
export function renewalLevel(expiresAt: Date | null, now = new Date()): 0 | 1 | 2 | 3 {
  if (!expiresAt) return 0;
  const left = expiresAt.getTime() - now.getTime();
  if (left <= 0) return 3;
  if (left <= 7 * DAY) return 2;
  if (left <= 30 * DAY) return 1;
  return 0;
}

export const RENEWAL_LABEL = { 1: "expires within 30 days", 2: "expires within 7 days", 3: "has expired" } as const;

/** True when a sent quote is due its one follow-up: unanswered, not yet nudged, old enough and still valid. */
export function quoteNeedsNudge(q: { status: string; sentAt: Date | null; nudgedAt: Date | null; validUntil: Date | null }, now = new Date()) {
  if (q.status !== "SENT" || q.nudgedAt || !q.sentAt) return false;
  if (q.validUntil && q.validUntil.getTime() < now.getTime()) return false;
  return now.getTime() - q.sentAt.getTime() >= QUOTE_NUDGE_DAYS * DAY;
}

/** Only plain http(s) addresses may be monitored. Returns the cleaned URL or null. */
export function monitorTarget(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** A site counts as up for any answer below 500; a 401/403 still proves the server is alive. */
export const isUpStatus = (status: number) => status > 0 && status < 500;

export function formatDuration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h} h ${m % 60} min` : `${Math.round(h / 24)} days`;
}
