import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time compare of two hex/ascii strings of any length. */
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Paystack signs the raw body with HMAC-SHA512 using the secret key, hex in `x-paystack-signature`. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  return safeEqual(createHmac("sha512", secret).update(rawBody).digest("hex"), signature);
}

/**
 * Stripe header looks like `t=1700000000,v1=<hex>[,v1=<hex>]`. The signed payload is `${t}.${rawBody}`
 * (HMAC-SHA256 with the endpoint secret). Reject anything outside the tolerance window to stop replays.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowMs = Date.now(), toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowMs / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => safeEqual(expected, s));
}

export type Provider = "paystack" | "stripe";

const PAYSTACK_CURRENCIES = ["GHS", "NGN", "USD"];
const STRIPE_CURRENCIES = ["USD", "EUR", "GBP"];

/** Which gateways can take this currency, given which keys are configured. */
export function providersFor(currency: string, env: Record<string, string | undefined> = process.env): Provider[] {
  const out: Provider[] = [];
  if (env.PAYSTACK_SECRET_KEY && PAYSTACK_CURRENCIES.includes(currency)) out.push("paystack");
  if (env.STRIPE_SECRET_KEY && STRIPE_CURRENCIES.includes(currency)) out.push("stripe");
  return out;
}

export type KeyField = "paystack" | "stripe" | "stripeWebhook";

/** Shape checks only: catches pasted-wrong-thing mistakes, not whether the key is real (the Test button does that). */
export const KEY_PATTERN: Record<KeyField, RegExp> = {
  paystack: /^sk_(test|live)_[A-Za-z0-9]{10,}$/,
  stripe: /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/,
  stripeWebhook: /^whsec_[A-Za-z0-9+/=_-]{10,}$/,
};

export const KEY_HINT: Record<KeyField, string> = {
  paystack: "Paystack secret key, starts with sk_test_ or sk_live_",
  stripe: "Stripe secret key, starts with sk_test_, sk_live_ or rk_",
  stripeWebhook: "Stripe signing secret, starts with whsec_",
};

export function keyMode(key: string | null): "test" | "live" | null {
  if (!key) return null;
  if (key.includes("_test_")) return "test";
  if (key.includes("_live_")) return "live";
  return null;
}
