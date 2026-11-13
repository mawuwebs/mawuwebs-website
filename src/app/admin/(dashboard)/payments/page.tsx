import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysFromNow } from "@/lib/portal-constants";
import { Badge } from "@/components/ui/badge";
import { siteUrl } from "@/lib/mail";
import { getGatewayConfig } from "@/lib/payment-config";
import { keyMode } from "@/lib/payments-verify";
import { PaymentSettingsForm, type FieldStatus } from "@/components/admin/payment-settings-form";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/admin");
  const [cfg, events, problems] = await Promise.all([
    getGatewayConfig(),
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.webhookEvent.count({ where: { outcome: { in: ["ignored", "rejected", "error"] }, createdAt: { gt: daysFromNow(-7) } } }),
  ]);
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
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent webhook events</h2>
        {problems > 0 && (
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {problems} event{problems === 1 ? "" : "s"} in the last 7 days could not be applied. Money may have moved at the gateway without being recorded here. Check the rows marked below against your Paystack or Stripe dashboard.
          </p>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing received yet. Once a payment or refund happens at a gateway it will appear here.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3 font-medium">When</th><th className="p-3 font-medium">Gateway</th><th className="p-3 font-medium">Event</th><th className="p-3 font-medium">Result</th><th className="p-3 font-medium">Details</th></tr></thead>
              <tbody className="divide-y divide-border">
                {events.map((e) => {
                  const bad = e.outcome === "ignored" || e.outcome === "rejected" || e.outcome === "error";
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap p-3 text-muted-foreground">{formatDistanceToNow(e.createdAt, { addSuffix: true })}</td>
                      <td className="p-3 capitalize">{e.provider}</td>
                      <td className="p-3 font-mono text-xs">{e.eventType}</td>
                      <td className="p-3"><Badge variant="outline" className={bad ? "border-destructive/40 text-destructive" : e.outcome === "recorded" ? "border-success/30 bg-success/10 text-success" : ""}>{e.outcome}</Badge></td>
                      <td className="p-3 text-muted-foreground">{e.detail}{e.reference ? <span className="block break-all font-mono text-xs">{e.reference}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">Server environment variables (PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) still work as a fallback; keys saved here take priority. If you change AUTH_SECRET, saved keys become unreadable and must be entered again.</p>
    </div>
  );
}
