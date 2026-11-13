import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { DowntimeCalculator } from "@/components/site/downtime-calculator";

export const metadata: Metadata = {
  title: "What do IT problems cost your business?",
  description: "A free calculator for the yearly cost of lost staff time and serious outages, using your own numbers.",
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Free calculator"
        title="What do IT problems cost you?"
        description="Put in your own numbers. Nothing is stored or sent."
        breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "Cost calculator" }]}
      />
      <Section>
        <DowntimeCalculator />
      </Section>
    </>
  );
}
