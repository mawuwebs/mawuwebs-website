import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { amountPaid, balanceDue, formatMoney, totals } from "@/lib/billing";
import { getGatewayConfig } from "@/lib/payment-config";
import type { Provider } from "@/lib/payments-verify";

const TIMEOUT = 10_000;

/** Starts a hosted checkout for the invoice's current balance and returns the URL to send the payer to. */
export async function createCheckoutUrl(token: string, provider: Provider): Promise<{ url: string } | { error: string }> {
  const inv = await prisma.invoice.findUnique({ where: { token }, include: { items: true, payments: true, user: { select: { email: true } } } });
  if (!inv || inv.status !== "SENT") return { error: "This invoice cannot be paid online." };
  const balance = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
  if (balance <= 0) return { error: "This invoice has nothing left to pay." };
  const cfg = await getGatewayConfig();
  const back = `${siteUrl()}/i/${inv.token}?paid=1`;

  try {
    if (provider === "paystack") {
      const key = cfg.paystack.value;
      if (!key) return { error: "Online payment is not set up." };
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inv.user.email, amount: balance, currency: inv.currency, callback_url: back,
          reference: `${inv.number}-${randomBytes(6).toString("hex")}`, metadata: { invoiceId: inv.id },
        }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      const json = (await res.json()) as { status?: boolean; data?: { authorization_url?: string } };
      if (!res.ok || !json.status || !json.data?.authorization_url) return { error: "Paystack could not start the payment. Try again or pay another way." };
      return { url: json.data.authorization_url };
    }

    const key = cfg.stripe.value;
    if (!key) return { error: "Online payment is not set up." };
    const form = new URLSearchParams({
      mode: "payment", success_url: back, cancel_url: `${siteUrl()}/i/${inv.token}`, customer_email: inv.user.email,
      "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": inv.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(balance), "line_items[0][price_data][product_data][name]": `Invoice ${inv.number}`,
      "metadata[invoiceId]": inv.id, "payment_intent_data[metadata][invoiceId]": inv.id,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const json = (await res.json()) as { url?: string };
    if (!res.ok || !json.url) return { error: "Stripe could not start the payment. Try again or pay another way." };
    return { url: json.url };
  } catch (err) {
    console.error("[gateway] checkout failed", err);
    return { error: "The payment provider did not respond. Try again in a moment." };
  }
}

export type ApplyOutcome = "recorded" | "duplicate" | "ignored";

/**
 * Record money the gateway says it received. Idempotent on `externalId` (gateways retry webhooks).
 * The money is real once the gateway confirms it, so it is recorded even if the invoice is already
 * paid or void; only an unknown invoice or a currency mismatch is ignored.
 */
export async function applyGatewayPayment(p: { invoiceId: string; amount: number; currency: string; provider: Provider; externalId: string; reference: string }): Promise<ApplyOutcome> {
  if (!Number.isSafeInteger(p.amount) || p.amount <= 0) return "ignored";
  type Done = { number: string; currency: string; userId: string; user: { name: string; email: string }; settled: boolean };
  let done: Done | null;
  try {
    done = await prisma.$transaction(async (tx): Promise<Done | null> => {
      if (await tx.payment.findUnique({ where: { externalId: p.externalId }, select: { id: true } })) return null;
      const inv = await tx.invoice.findUnique({ where: { id: p.invoiceId }, include: { items: true, payments: true, user: { select: { name: true, email: true } } } });
      if (!inv || inv.currency.toUpperCase() !== p.currency.toUpperCase()) throw new Error("ignored");
      await tx.payment.create({ data: { invoiceId: inv.id, amount: p.amount, method: p.provider, reference: p.reference, externalId: p.externalId } });
      const settled = amountPaid(inv.payments) + p.amount >= totals(inv.items, inv.taxBp).total;
      if (settled && inv.status === "SENT") await tx.invoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt: new Date() } });
      return { number: inv.number, currency: inv.currency, userId: inv.userId, user: inv.user, settled };
    });
  } catch (err) {
    // P2002 = lost a race on the unique externalId: another delivery of the same event won.
    if ((err as { code?: string }).code === "P2002") return "duplicate";
    if (err instanceof Error && err.message === "ignored") return "ignored";
    throw err;
  }
  if (!done) return "duplicate";

  await logActivity({ userId: null, action: "updated", entityType: "Invoice", entityId: p.invoiceId, message: `${p.provider} payment of ${formatMoney(p.amount, done.currency)} on ${done.number}${done.settled ? " (paid in full)" : ""}` });
  const settings = await getSiteSettings();
  await Promise.all([
    sendMail({
      to: done.user.email, replyTo: notifyEmail(settings.contactEmail), subject: `Payment received for invoice ${done.number}`,
      text: `Hi ${done.user.name.split(" ")[0]},\n\nThank you. We received ${formatMoney(p.amount, done.currency)} for invoice ${done.number}${done.settled ? ", which is now paid in full" : ""}.\n\n${settings.siteName}`,
    }),
    sendMail({ to: notifyEmail(settings.contactEmail), subject: `Online payment: ${done.number}`, text: `${done.user.name} paid ${formatMoney(p.amount, done.currency)} by ${p.provider} on ${done.number}.\n\n${siteUrl()}/admin/billing` }),
  ]);
  revalidatePath("/admin/billing");
  revalidatePath(`/admin/clients/${done.userId}`);
  revalidatePath("/portal/billing");
  return "recorded";
}
