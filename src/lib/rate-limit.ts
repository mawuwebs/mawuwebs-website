import { headers } from "next/headers";

// In-memory sliding window. Per server instance: fine for one Node process,
// use Redis/Upstash if you scale to several instances.
const hits = new Map<string, number[]>();

/**
 * Client IP. A client can put anything at the front of X-Forwarded-For, but each trusted proxy
 * appends the address it saw to the END. TRUSTED_PROXY_HOPS (default 1) is how many proxies sit
 * in front of this app; we read that many entries from the right. Set it to 0 when the app is
 * exposed directly (the header is then ignored).
 */
export async function clientIp() {
  const h = await headers();
  const hops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 0);
  if (hops === 0) return "unknown";
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf && process.env.TRUSTED_PROXY_CLOUDFLARE === "1") return cf;
  const parts = (h.get("x-forwarded-for") ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const fromRight = parts[parts.length - hops];
  return fromRight || h.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true when the caller is over the limit. */
export async function rateLimited(bucket: string, max: number, windowMs: number) {
  const ip = await clientIp();
  // No proxy header means every visitor shares one bucket; don't let that lock the whole site out.
  if (ip === "unknown") max *= 10;
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return recent.length > max;
}
