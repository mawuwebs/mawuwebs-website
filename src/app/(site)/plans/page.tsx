import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { Section } from "@/components/site/container";
import { CtaBanner } from "@/components/site/cta-banner";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Managed IT plans",
  description:
    "Ongoing IT support plans for businesses: help desk, monitoring, backups and on-site care, scaled to the size of your team.",
};

export default async function PlansPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <PageHeader
        eyebrow="Managed IT"
        title="IT support plans that grow with your team"
        description="Instead of paying for emergencies, pay for steady care. Pick a level of cover. We'll tailor it to your size and tell you the cost in writing."
        illustration={<Illustration variant="list" className="h-full w-full" />}
      />
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-8",
                plan.highlight ? "border-accent bg-accent/5 shadow-lg" : "border-border bg-card"
              )}
            >
              {plan.highlight && (
                <span className="mb-3 w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-muted-foreground">{plan.tagline}</p>
              <p className="mt-6 font-display text-xl font-semibold">{plan.price ?? "Quoted to fit your team"}</p>
              <p className="mt-4 text-sm text-muted-foreground">{plan.forWho}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                render={<Link href={`/start-a-project?type=${encodeURIComponent("IT support or managed services")}&from=${encodeURIComponent(plan.name + " plan")}`} />}
                variant={plan.highlight ? "default" : "outline"}
                size="lg"
                className="mt-8 w-full"
              >
                Ask about {plan.name}
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            Not sure which fits? We start with a short review of what you have today, then recommend the
            lightest plan that covers the risk.
          </p>
          <p>
            Need help right now instead?{" "}
            <Link href="/support" className="font-medium text-accent underline underline-offset-4">
              Send a support request
            </Link>
            {settings.supportPromise ? `. ${settings.supportPromise}.` : "."}
          </p>
        </div>
      </Section>
      <CtaBanner
        title="Want IT you don't have to think about?"
        description="Tell us about your team and equipment and we'll suggest the right plan."
        ctaText="Talk about a plan"
        ctaUrl="/start-a-project?type=IT%20support%20or%20managed%20services"
      />
    </>
  );
}
