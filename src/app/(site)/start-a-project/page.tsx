import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, FileText, Lock, Mail, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ProjectBriefForm } from "@/components/site/project-brief-form";
import { BRIEF_TYPES, BRIEF_TIMELINES } from "@/lib/brief";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell us about your project. A short brief helps us reply with real questions and a clear next step.",
};

const STEPS = [
  { icon: FileText, title: "You send a brief", body: "Four short steps, about three minutes." },
  { icon: Clock, title: "We reply in one business day", body: "From a person, with questions or a next step. Not an auto-reply." },
  { icon: MessageSquare, title: "We talk it through", body: "A call or a thread, then a written scope and quote if it's a fit." },
];

const ASSURANCES = [
  { icon: ShieldCheck, text: "No commitment, no sales pressure" },
  { icon: Lock, text: "Your details stay with our team" },
];

export default async function StartProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; timeline?: string; from?: string }>;
}) {
  const [sp, settings] = await Promise.all([searchParams, getSiteSettings()]);
  const defaultType = (BRIEF_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : undefined;
  const defaultTimeline = (BRIEF_TIMELINES as readonly string[]).includes(sp.timeline ?? "") ? sp.timeline : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Start a project"
        title="Tell us what you need"
        description="A website, a network, IT support, security or hardware: four short questions and we'll reply within one business day with real questions, not a template."
        className="[&>div:last-child]:py-14 sm:[&>div:last-child]:py-16"
      />
      <Section className="pt-10 sm:pt-14 lg:pt-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_0.7fr] lg:gap-16">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
            <ProjectBriefForm
              defaultType={defaultType}
              defaultTimeline={defaultTimeline}
              fromEstimate={sp.from}
            />
          </div>

          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div>
              <h2 className="font-display text-lg font-semibold">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium">
                        <span className="text-muted-foreground">{i + 1}. </span>
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <ul className="space-y-3 border-y border-border py-6 text-sm">
              {ASSURANCES.map((a) => (
                <li key={a.text} className="flex items-center gap-3">
                  <a.icon className="size-4 shrink-0 text-success" />
                  {a.text}
                </li>
              ))}
            </ul>

            <div>
              <h2 className="font-display text-lg font-semibold">Prefer to talk?</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-3 hover:text-accent">
                    <Mail className="size-4 shrink-0 text-accent" />
                    {settings.contactEmail}
                  </a>
                </li>
                <li>
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 hover:text-accent">
                    <Phone className="size-4 shrink-0 text-accent" />
                    {settings.phone}
                  </a>
                </li>
                {settings.bookingUrl && (
                  <li>
                    <a
                      href={settings.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover:text-accent"
                    >
                      <CalendarDays className="size-4 shrink-0 text-accent" />
                      Book a 15-minute call
                    </a>
                  </li>
                )}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">
                Not sure of the scope?{" "}
                <Link href="/estimate" className="font-medium text-accent underline underline-offset-4">
                  Try the estimator
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
