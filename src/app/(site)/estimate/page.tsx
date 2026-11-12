import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { EstimateWizard } from "@/components/site/estimate-wizard";
import { getEstimateConfig } from "@/lib/form-config";

export const metadata: Metadata = {
  title: "Project estimate",
  description: "A few quick questions to see roughly how big your website, app or IT project is and how long it usually takes.",
};

export default async function EstimatePage() {
  const config = await getEstimateConfig();
  return (
    <>
      <PageHeader
        eyebrow="Estimate"
        title="What would your project involve?"
        description="A few quick questions. You'll see roughly how big the job is and how long it usually takes. No email needed to see the result."
      />
      <Section>
        <EstimateWizard config={config} />
      </Section>
    </>
  );
}
