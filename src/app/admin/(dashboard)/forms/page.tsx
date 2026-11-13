import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEstimateConfig, getHealthCheckQuestions, getSupportConfig } from "@/lib/form-config";
import { Calculator, ClipboardCheck, LifeBuoy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstimateConfigEditor, HealthCheckConfigEditor, SupportConfigEditor } from "@/components/admin/forms-config-editor";

export const metadata: Metadata = { title: "Forms & estimates" };

export default async function FormsConfigPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");
  const [support, estimate, healthQuestions, saved] = await Promise.all([
    getSupportConfig(),
    getEstimateConfig(),
    getHealthCheckQuestions(),
    prisma.formConfig.findMany({ select: { key: true } }),
  ]);
  const customised = new Set(saved.map((s) => s.key));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Forms &amp; estimates</h1>
        <p className="mt-1 text-muted-foreground">
          The choices visitors see on the Support form, the Estimate wizard and the IT health check. Changes go live as soon as you save.
        </p>
      </div>

      <Tabs defaultValue="support">
        <TabsList>
          <TabsTrigger value="support">
            <LifeBuoy className="size-4" />
            Support request form
          </TabsTrigger>
          <TabsTrigger value="estimate">
            <Calculator className="size-4" />
            Project estimate wizard
          </TabsTrigger>
          <TabsTrigger value="healthcheck">
            <ClipboardCheck className="size-4" />
            IT health check
          </TabsTrigger>
        </TabsList>
        <TabsContent value="support" className="rounded-2xl border border-border bg-card p-6">
          <SupportConfigEditor initialConfig={support} customised={customised.has("support")} />
        </TabsContent>
        <TabsContent value="estimate" className="rounded-2xl border border-border bg-card p-6">
          <EstimateConfigEditor initialConfig={estimate} customised={customised.has("estimate")} />
        </TabsContent>
        <TabsContent value="healthcheck" className="rounded-2xl border border-border bg-card p-6">
          <HealthCheckConfigEditor initialConfig={healthQuestions} customised={customised.has("healthcheck")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
