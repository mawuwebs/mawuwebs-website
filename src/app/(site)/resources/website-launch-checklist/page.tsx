import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { LaunchChecklist } from "@/components/site/launch-checklist";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { CtaBanner } from "@/components/site/cta-banner";

export const metadata: Metadata = {
  title: "Website launch checklist",
  description:
    "A free, interactive checklist to run through before your website goes live. Your progress is saved in your browser.",
};

export default function ChecklistPage() {
  return (
    <>
      <PageHeader
        eyebrow="Free resource"
        title="Before you launch your website"
        description="The things that get forgotten on launch day. Tick them off as you go; your progress is saved in this browser."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Launch checklist" },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <LaunchChecklist />
          <div className="mt-16 rounded-2xl bg-secondary p-8">
            <h2 className="font-display text-2xl font-semibold">Want more like this?</h2>
            <p className="mt-2 text-muted-foreground">
              Short practical articles by email, now and then.
            </p>
            <NewsletterForm className="mt-5 max-w-md" />
            <p className="mt-6 text-sm text-muted-foreground">
              Planning a build?{" "}
              <Link href="/estimate" className="font-medium text-accent underline underline-offset-4">
                Estimate your project
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}
