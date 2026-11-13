import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { HealthCheck } from "@/components/site/health-check";
import { prisma } from "@/lib/prisma";
import { live } from "@/lib/content";
import { getHealthCheckQuestions } from "@/lib/form-config";

export const metadata: Metadata = {
  title: "Free IT health check",
  description: "Quick questions on backups, security, accounts and support. Get a score and a list of gaps to close, free.",
};

export default async function HealthCheckPage() {
  // Only link to services that are live, so a result never points at a 404.
  const [services, questions] = await Promise.all([
    prisma.service.findMany({ where: live(), select: { slug: true, title: true } }),
    getHealthCheckQuestions(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Free tool"
        title="How healthy is your business IT?"
        description="A few quick questions, about three minutes. You get a score, the gaps worth fixing first, and a copy by email."
        breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "IT health check" }]}
      />
      <Section>
        <HealthCheck questions={questions} services={Object.fromEntries(services.map((s) => [s.slug, s.title]))} />
      </Section>
    </>
  );
}
