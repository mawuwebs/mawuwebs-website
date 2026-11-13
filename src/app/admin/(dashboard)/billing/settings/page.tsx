import type { Metadata } from "next";
import Link from "next/link";
import { guardArea } from "@/lib/guard-area";
import { getBillingSettings } from "@/lib/billing-settings";
import { BillingSettingsForm } from "@/components/admin/billing-settings-form";

export const metadata: Metadata = { title: "Billing settings" };
export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  await guardArea("billing");
  const initial = await getBillingSettings();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Billing settings</h1>
      </div>
      <BillingSettingsForm initial={initial} />
    </div>
  );
}
