import { NextResponse, type NextRequest } from "next/server";
import { applyGatewayPayment } from "@/lib/gateway";
import { getGatewayConfig } from "@/lib/payment-config";
import { verifyPaystackSignature } from "@/lib/payments-verify";

/** Paystack webhook. Set the URL in the Paystack dashboard to https://yourdomain/api/webhooks/paystack */
export async function POST(request: NextRequest) {
  const secret = (await getGatewayConfig()).paystack.value;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"), secret)) return new NextResponse("Bad signature", { status: 401 });

  let evt: { event?: string; data?: { status?: string; reference?: string; amount?: number; currency?: string; id?: number; metadata?: { invoiceId?: string } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const d = evt.data;
  if (evt.event === "charge.success" && d?.status === "success" && d.metadata?.invoiceId && typeof d.amount === "number" && d.currency && d.reference) {
    // A thrown error returns 500 so Paystack retries; recording is idempotent so retries are safe.
    await applyGatewayPayment({ invoiceId: d.metadata.invoiceId, amount: d.amount, currency: d.currency, provider: "paystack", externalId: `paystack:${d.reference}`, reference: d.reference });
  }
  return NextResponse.json({ received: true });
}
