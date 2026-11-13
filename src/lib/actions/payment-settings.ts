"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { encryptSecret } from "@/lib/secrets";
import { getGatewayConfig } from "@/lib/payment-config";
import { KEY_HINT, KEY_PATTERN, keyMode, type KeyField } from "@/lib/payments-verify";

export type SettingResult = { success: boolean; message: string };

const LABEL: Record<KeyField, string> = { paystack: "Paystack secret key", stripe: "Stripe secret key", stripeWebhook: "Stripe webhook secret" };
const isField = (f: string): f is KeyField => f in KEY_PATTERN;

async function guard(fn: () => Promise<SettingResult>): Promise<SettingResult> {
  try {
    return await fn();
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Admin only. The key is encrypted before it is stored and is never sent back to the browser. */
export async function savePaymentKey(field: string, value: string): Promise<SettingResult> {
  return guard(async () => {
    const admin = await requireAdmin();
    if (!isField(field)) return { success: false, message: "Unknown setting." };
    const key = value.trim();
    if (!KEY_PATTERN[field].test(key)) return { success: false, message: `That does not look right. Expected: ${KEY_HINT[field]}.` };
    const enc = encryptSecret(key);
    await prisma.paymentSetting.upsert({ where: { key: field }, create: { key: field, value: enc }, update: { value: enc } });
    await logActivity({ userId: admin.id, action: "updated", entityType: "PaymentSetting", entityId: field, message: `${admin.name ?? "Admin"} updated the ${LABEL[field]}` });
    revalidatePath("/admin/payments");
    const mode = keyMode(key);
    return { success: true, message: `${LABEL[field]} saved${mode ? ` (${mode} mode)` : ""}. Use Test connection to check it.` };
  });
}

export async function removePaymentKey(field: string): Promise<SettingResult> {
  return guard(async () => {
    const admin = await requireAdmin();
    if (!isField(field)) return { success: false, message: "Unknown setting." };
    await prisma.paymentSetting.deleteMany({ where: { key: field } });
    await logActivity({ userId: admin.id, action: "deleted", entityType: "PaymentSetting", entityId: field, message: `${admin.name ?? "Admin"} removed the ${LABEL[field]}` });
    revalidatePath("/admin/payments");
    return { success: true, message: `${LABEL[field]} removed.` };
  });
}

/** Asks the gateway for the account balance with the saved key: proves the key is real without moving money. */
export async function testGateway(provider: "paystack" | "stripe"): Promise<SettingResult> {
  return guard(async () => {
    await requireAdmin();
    const cfg = await getGatewayConfig();
    const key = provider === "paystack" ? cfg.paystack.value : cfg.stripe.value;
    if (!key) return { success: false, message: "No key saved yet." };
    const url = provider === "paystack" ? "https://api.paystack.co/balance" : "https://api.stripe.com/v1/balance";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res) return { success: false, message: "Could not reach the provider. Check your connection and try again." };
    if (res.status === 401 || res.status === 403) return { success: false, message: "The provider rejected this key. Copy it again from the dashboard." };
    if (!res.ok) return { success: false, message: `The provider answered with an error (${res.status}).` };
    const mode = keyMode(key);
    return { success: true, message: `Connected${mode ? ` in ${mode} mode` : ""}.${mode === "test" ? " Test keys never move real money." : ""}` };
  });
}
