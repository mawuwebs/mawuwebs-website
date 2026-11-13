import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { Section } from "@/components/site/container";
import { CtaBanner } from "@/components/site/cta-banner";
import { Button } from "@/components/ui/button";
import { getPlans } from "@/lib/content";
import type { Plan } from "@/lib/plans";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Managed IT plans",
  description:
    "Ongoing IT support plans for businesses: help desk, monitoring, backups and on-site care, scaled to the size of your team.",
};

/** Features each plan really includes, rolling "Everything in X" up from the plan before it. */
function buildMatrix(PLANS: Plan[]) {
  const own = PLANS.map((p) => p.features.filter((f) => !f.startsWith("Everything in")));
  const rows = [...new Set(own.flat())];
  const has: Set<string>[] = [];
  PLANS.forEach((p, i) => {
    const set = new Set(own[i]);
    if (i > 0 && p.features.some((f) => f.startsWith("Everything in"))) has[i - 1].forEach((f) => set.add(f));
    has.push(set);
  });
  return { rows, has };
}

export default async function PlansPage() {
  const [settings, PLANS] = await Promise.all([getSiteSettings(), getPlans()]);
  const { rows, has } = buildMatrix(PLANS);
  const cols = PLANS.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : PLANS.length >= 3 ? "lg:grid-cols-3" : PLANS.length === 2 ? "lg:grid-cols-2 lg:mx-auto lg:max-w-4xl" : "lg:mx-auto lg:max-w-md";
  return (
    <>
      <PageHeader
        eyebrow="Managed IT"
        title="IT support plans that grow with your team"
        description="Instead of paying for emergencies, pay for steady care. Pick a level of cover. We'll tailor it to your size and tell you the cost in writing."
        illustration={<Illustration variant="list" className="h-full w-full" />}
      />
      <Section>
        {PLANS.length === 0 && (
          <p className="mx-auto max-w-xl text-center text-muted-foreground">
            Our plans are being updated. Get in touch and we&apos;ll recommend the right cover for your team.
          </p>
        )}
        <div className={cn("grid grid-cols-1 items-stretch gap-6 lg:gap-8", cols)}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-6 transition-shadow sm:p-8",
                plan.highlight
                  ? "order-first border-2 border-accent bg-accent/5 shadow-xl lg:order-none lg:-my-4 lg:py-12"
                  : "border-border bg-card hover:shadow-md"
              )}
            >
              {plan.highlight && (
                <span className="mb-3 w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-muted-foreground">{plan.tagline}</p>
              <p className="mt-6 border-t border-border pt-6 font-display text-xl font-semibold">{plan.price ?? "Quoted to fit your team"}</p>
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
                render={<Link href={`/plans/enquire?plan=${plan.slug}`} />}
                variant={plan.highlight ? "default" : "outline"}
                size="lg"
                className="mt-8 w-full"
              >
                Get {plan.name}
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-20">
          <h2 id="compare" className="scroll-mt-24 font-display text-2xl font-bold">Compare plans</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Features included in each managed IT plan</caption>
              <thead className="bg-secondary/60">
                <tr>
                  <th scope="col" className="p-4 font-medium text-muted-foreground">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.slug} scope="col" className={cn("p-4 text-center font-display font-semibold", p.highlight && "text-accent")}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row} className="border-t border-border">
                    <th scope="row" className="p-4 font-normal">{row}</th>
                    {PLANS.map((p, i) => (
                      <td key={p.slug} className={cn("p-4 text-center", p.highlight && "bg-accent/5")}>
                        {has[i].has(row) ? (
                          <>
                            <Check className="mx-auto size-4 text-success" />
                            <span className="sr-only">Included</span>
                          </>
                        ) : (
                          <>
                            <Minus className="mx-auto size-4 text-muted-foreground/50" />
                            <span className="sr-only">Not included</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold">How it works</h2>
          <ol className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ["Short review", "We look at what you have today: devices, email, network, backups."],
              ["Written recommendation", "We suggest the lightest plan that covers the risk and put the cost in writing."],
              ["We take over", "You agree, we onboard your team and start looking after things."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-border bg-card p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-4 font-display text-base font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            Questions about contracts or pricing? Read the{" "}
            <Link href="/faq" className="font-medium text-accent underline underline-offset-4">
              FAQ
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="inline-flex items-center gap-1 font-medium text-accent underline underline-offset-4">
              <MessageCircle className="size-3.5" />
              message us
            </Link>
            .
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
