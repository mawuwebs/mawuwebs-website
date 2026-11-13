import { NextResponse, type NextRequest } from "next/server";
import { applyGatewayPayment } from "@/lib/gateway";
import { getGatewayConfig } from "@/lib/payment-config";
import { verifyStripeSignature } from "@/lib/payments-verify";

/** Stripe webhook (event: checkout.session.completed). URL: https://yourdomain/api/webhooks/stripe */
export async function POST(request: NextRequest) {
  const secret = (await getGatewayConfig()).stripeWebhook.value;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) return new NextResponse("Bad signature", { status: 401 });

  let evt: { type?: string; data?: { object?: { id?: string; payment_status?: string; amount_total?: number; currency?: string; payment_intent?: string; metadata?: { invoiceId?: string } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const s = evt.data?.object;
  if (evt.type === "checkout.session.completed" && s?.payment_status === "paid" && s.metadata?.invoiceId && typeof s.amount_total === "number" && s.currency && s.id) {
    await applyGatewayPayment({ invoiceId: s.metadata.invoiceId, amount: s.amount_total, currency: s.currency, provider: "stripe", externalId: `stripe:${s.id}`, reference: s.payment_intent ?? s.id });
  }
  return NextResponse.json({ received: true });
}
