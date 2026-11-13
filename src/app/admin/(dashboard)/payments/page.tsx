import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { siteUrl } from "@/lib/mail";
import { getGatewayConfig } from "@/lib/payment-config";
import { keyMode } from "@/lib/payments-verify";
import { PaymentSettingsForm, type FieldStatus } from "@/components/admin/payment-settings-form";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/admin");
  const cfg = await getGatewayConfig();
  const status = (field: FieldStatus["field"], label: string, placeholder: string): FieldStatus => {
    const k = cfg[field];
    return { field, label, placeholder, source: k.source, mode: keyMode(k.value), last4: k.value ? k.value.slice(-4) : null, unreadable: k.unreadable };
  };
  const base = siteUrl();
  const local = /localhost|127\.0\.0\.1/.test(base);
  const anyLive = [cfg.paystack, cfg.stripe].some((k) => keyMode(k.value) === "live");
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Let clients pay invoices online. Keys are encrypted before they are stored and are never shown again after saving. Start with <strong>test</strong> keys.</p>
      </div>
      {local && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">The site address (AUTH_URL) is still localhost, so the webhook URLs below will not work from Paystack or Stripe. Set AUTH_URL to your live address first.</p>}
      {anyLive && <p className="rounded-xl border border-border bg-card p-3 text-sm">A live key is active. Payments made now are real.</p>}
      <PaymentSettingsForm
        paystack={status("paystack", "Secret key", "sk_test_…")}
        stripe={status("stripe", "Secret key", "sk_test_…")}
        stripeWebhook={status("stripeWebhook", "Webhook signing secret", "whsec_…")}
        paystackHook={`${base}/api/webhooks/paystack`}
        stripeHook={`${base}/api/webhooks/stripe`}
        paystackReady={!!cfg.paystack.value}
        stripeReady={!!cfg.stripe.value}
      />
      <p className="text-xs text-muted-foreground">Server environment variables (PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) still work as a fallback; keys saved here take priority. If you change AUTH_SECRET, saved keys become unreadable and must be entered again.</p>
    </div>
  );
}
