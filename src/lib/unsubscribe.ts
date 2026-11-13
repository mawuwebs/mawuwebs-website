import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed, non-expiring token for the "stop progress emails" link. Only the server can make one for a given user id. */
export function progressToken(userId: string, secret = process.env.AUTH_SECRET ?? "") {
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return createHmac("sha256", secret).update(`progress-emails:${userId}`).digest("base64url");
}

export function verifyProgressToken(userId: string, token: string, secret = process.env.AUTH_SECRET ?? "") {
  if (!secret || !userId || !token) return false;
  const want = Buffer.from(progressToken(userId, secret));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

export const progressUnsubscribeUrl = (siteUrl: string, userId: string) => `${siteUrl}/updates?u=${encodeURIComponent(userId)}&t=${progressToken(userId)}`;
