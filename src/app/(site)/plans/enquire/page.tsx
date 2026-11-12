import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { PlanEnquiry } from "@/components/site/plan-enquiry-form";
import { getPlans } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Ask about a managed IT plan",
  description: "Pick a plan, tell us about your team, and get a written recommendation and cost within one business day.",
};

export default async function PlanEnquirePage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const [{ plan }, settings, plans] = await Promise.all([searchParams, getSiteSettings(), getPlans()]);
  const initial = plans.find((p) => p.slug === plan)?.slug;
  return (
    <>
      <PageHeader
        eyebrow="Managed IT"
        title="Ask about a plan"
        description="Choose the cover that fits, tell us about your team, and we'll reply in writing."
        breadcrumbs={[{ label: "Plans", href: "/plans" }, { label: "Ask about a plan" }]}
      />
      <Section>
        <PlanEnquiry plans={plans} initialPlan={initial} phone={settings.phone} />
      </Section>
    </>
  );
}
