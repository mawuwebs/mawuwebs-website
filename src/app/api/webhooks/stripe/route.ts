import { NextResponse, type NextRequest } from "next/server";
import { applyGatewayPayment, applyGatewayRefund, logWebhookEvent } from "@/lib/gateway";
import { getGatewayConfig } from "@/lib/payment-config";
import { verifyStripeSignature } from "@/lib/payments-verify";

type Evt = { type?: string; data?: { object?: { id?: string; amount_refunded?: number; payment_status?: string; amount_total?: number; currency?: string; payment_intent?: string; metadata?: { invoiceId?: string } } } };

/** Stripe webhook (events: checkout.session.completed, charge.refunded). URL: https://yourdomain/api/webhooks/stripe */
export async function POST(request: NextRequest) {
  const secret = (await getGatewayConfig()).stripeWebhook.value;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    await logWebhookEvent({ provider: "stripe", eventType: "unknown", outcome: "rejected", detail: "Signature did not match. Is the signing secret in Payments the one for this endpoint and mode?" });
    return new NextResponse("Bad signature", { status: 401 });
  }

  let evt: Evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const s = evt.data?.object;
  const type = evt.type ?? "unknown";
  try {
    if (type === "checkout.session.completed" && s?.payment_status === "paid" && s.metadata?.invoiceId && typeof s.amount_total === "number" && s.currency && s.id) {
      const outcome = await applyGatewayPayment({ invoiceId: s.metadata.invoiceId, amount: s.amount_total, currency: s.currency, provider: "stripe", externalId: `stripe:${s.id}`, reference: s.payment_intent ?? s.id });
      await logWebhookEvent({ provider: "stripe", eventType: type, outcome, reference: s.payment_intent ?? s.id });
    } else if (type === "charge.refunded" && s?.id && s.payment_intent && typeof s.amount_refunded === "number" && s.currency) {
      // Stripe sends the charge with the running total refunded, so only the new part is recorded.
      const outcome = await applyGatewayRefund({
        provider: "stripe", original: { reference: s.payment_intent }, amount: s.amount_refunded, currency: s.currency,
        cumulativeOf: `refund:stripe:${s.id}:`, externalId: `refund:stripe:${s.id}:${s.amount_refunded}`, reference: s.payment_intent,
      });
      await logWebhookEvent({ provider: "stripe", eventType: type, outcome, reference: s.payment_intent });
    } else {
      await logWebhookEvent({ provider: "stripe", eventType: type, outcome: "skipped", detail: "Event type or state not used by this site.", reference: s?.id ?? "" });
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    await logWebhookEvent({ provider: "stripe", eventType: type, outcome: "error", detail: err instanceof Error ? err.message : "Unexpected error", reference: s?.id ?? "" });
    return new NextResponse("Error", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
