import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts secrets (payment keys) before they go in the database, using AES-256-GCM with a key derived
 * from AUTH_SECRET. A stolen database file or backup is then useless without the server's AUTH_SECRET.
 * If AUTH_SECRET is changed, old values cannot be decrypted: decrypt() returns null and the key must be re-entered.
 */
function keyFrom(secret: string) {
  return createHash("sha256").update(`mawuwebs:payment-settings:${secret}`).digest();
}

export function encryptSecret(plain: string, authSecret = process.env.AUTH_SECRET ?? ""): string {
  if (!authSecret) throw new Error("AUTH_SECRET is not set, so secrets cannot be stored safely.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(authSecret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(":");
}

export function decryptSecret(stored: string, authSecret = process.env.AUTH_SECRET ?? ""): string | null {
  try {
    const [v, iv, tag, data] = stored.split(":");
    if (v !== "v1" || !iv || !tag || !data || !authSecret) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(authSecret), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
