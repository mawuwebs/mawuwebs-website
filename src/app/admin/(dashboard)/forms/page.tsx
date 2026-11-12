import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEstimateConfig, getSupportConfig } from "@/lib/form-config";
import { EstimateConfigEditor, SupportConfigEditor } from "@/components/admin/forms-config-editor";

export const metadata: Metadata = { title: "Forms & estimates" };

export default async function FormsConfigPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");
  const [support, estimate, saved] = await Promise.all([
    getSupportConfig(),
    getEstimateConfig(),
    prisma.formConfig.findMany({ select: { key: true } }),
  ]);
  const customised = new Set(saved.map((s) => s.key));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Forms &amp; estimates</h1>
        <p className="mt-1 text-muted-foreground">
          The choices visitors see on the Support form and the Estimate wizard. Changes go live as soon as you save.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Support request form</h2>
        <div className="mt-5">
          <SupportConfigEditor initialConfig={support} customised={customised.has("support")} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Project estimate wizard</h2>
        <div className="mt-5">
          <EstimateConfigEditor initialConfig={estimate} customised={customised.has("estimate")} />
        </div>
      </section>
    </div>
  );
}
