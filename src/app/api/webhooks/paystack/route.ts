import { NextResponse, type NextRequest } from "next/server";
import { applyGatewayPayment, applyGatewayRefund, logWebhookEvent } from "@/lib/gateway";
import { getGatewayConfig } from "@/lib/payment-config";
import { verifyPaystackSignature } from "@/lib/payments-verify";

type Evt = { event?: string; data?: { status?: string; reference?: string; transaction_reference?: string; refund_reference?: string; amount?: number; fees?: number; currency?: string; id?: number; metadata?: { invoiceId?: string } } };

/** Paystack webhook. Set the URL in the Paystack dashboard to https://yourdomain/api/webhooks/paystack */
export async function POST(request: NextRequest) {
  const secret = (await getGatewayConfig()).paystack.value;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"), secret)) {
    await logWebhookEvent({ provider: "paystack", eventType: "unknown", outcome: "rejected", detail: "Signature did not match. Is the secret key in Payments the one for this Paystack mode (test or live)?" });
    return new NextResponse("Bad signature", { status: 401 });
  }

  let evt: Evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const d = evt.data;
  const type = evt.event ?? "unknown";
  try {
    if (type === "charge.success" && d?.status === "success" && d.metadata?.invoiceId && typeof d.amount === "number" && d.currency && d.reference) {
      const outcome = await applyGatewayPayment({ invoiceId: d.metadata.invoiceId, amount: d.amount, currency: d.currency, provider: "paystack", externalId: `paystack:${d.reference}`, reference: d.reference, fee: typeof d.fees === "number" ? d.fees : undefined });
      await logWebhookEvent({ provider: "paystack", eventType: type, outcome, reference: d.reference });
    } else if (type === "refund.processed" && d?.transaction_reference && typeof d.amount === "number" && d.currency) {
      // Refund finished. Paystack refund payloads carry the original transaction reference.
      const outcome = await applyGatewayRefund({
        provider: "paystack", original: { externalId: `paystack:${d.transaction_reference}` }, amount: d.amount, currency: d.currency,
        externalId: `refund:paystack:${d.refund_reference ?? `${d.transaction_reference}:${d.amount}`}`, reference: d.refund_reference ?? d.transaction_reference,
      });
      await logWebhookEvent({ provider: "paystack", eventType: type, outcome, reference: d.transaction_reference });
    } else {
      await logWebhookEvent({ provider: "paystack", eventType: type, outcome: "skipped", detail: "Event type not used by this site.", reference: d?.reference ?? "" });
    }
  } catch (err) {
    console.error("[paystack-webhook]", err);
    await logWebhookEvent({ provider: "paystack", eventType: type, outcome: "error", detail: err instanceof Error ? err.message : "Unexpected error", reference: d?.reference ?? "" });
    // 500 makes Paystack retry; recording is idempotent so retries are safe.
    return new NextResponse("Error", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
