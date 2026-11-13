import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";
import { providersFor, type KeyField, type Provider } from "@/lib/payments-verify";

const ENV_NAME: Record<KeyField, string> = { paystack: "PAYSTACK_SECRET_KEY", stripe: "STRIPE_SECRET_KEY", stripeWebhook: "STRIPE_WEBHOOK_SECRET" };

export type KeyState = { value: string | null; source: "admin" | "env" | null; unreadable: boolean };
export type GatewayConfig = Record<KeyField, KeyState>;

/** Keys saved in Admin > Payments win; server environment variables are the fallback. */
export async function getGatewayConfig(): Promise<GatewayConfig> {
  const rows = await prisma.paymentSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as GatewayConfig;
  for (const f of Object.keys(ENV_NAME) as KeyField[]) {
    const stored = byKey.get(f);
    const decrypted = stored ? decryptSecret(stored) : null;
    if (decrypted) out[f] = { value: decrypted, source: "admin", unreadable: false };
    else {
      const env = process.env[ENV_NAME[f]] || null;
      out[f] = { value: env, source: env ? "env" : null, unreadable: !!stored };
    }
  }
  return out;
}

export async function providersForCurrency(currency: string): Promise<Provider[]> {
  const c = await getGatewayConfig();
  return providersFor(currency, { PAYSTACK_SECRET_KEY: c.paystack.value ?? undefined, STRIPE_SECRET_KEY: c.stripe.value ?? undefined });
}
