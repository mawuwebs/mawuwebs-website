import type { Metadata } from "next";
import Link from "next/link";
import { guardArea } from "@/lib/guard-area";
import { daysFromNow } from "@/lib/portal-constants";
import { getBillingSettings } from "@/lib/billing-settings";
import { bpToPercent } from "@/lib/billing";
import { editorOptions } from "@/lib/billing-queries";
import { DocumentEditor } from "@/components/admin/document-editor";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  await guardArea("billing");
  const sp = await searchParams;
  const [{ clients, projects }, bs] = await Promise.all([editorOptions(), getBillingSettings()]);
  const due = daysFromNow(bs.defaultDueDays).toISOString().slice(0, 10);
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">New invoice</h1>
      </div>
      <DocumentEditor
        kind="invoice" id={null} clients={clients} projects={projects}
        initial={{ clientId: clients.some((c) => c.id === sp.client) ? sp.client! : "", projectId: "", title: "", currency: bs.defaultCurrency, taxPercent: bpToPercent(bs.defaultTaxBp), notes: "", date: due, depositPercent: "", items: [{ description: "", quantity: "1", unit: "" }] }}
      />
    </div>
  );
}
