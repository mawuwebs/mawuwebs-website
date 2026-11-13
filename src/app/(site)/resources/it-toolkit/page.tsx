import type { Metadata } from "next";
import { cookies } from "next/headers";
import { FileText, HardDrive, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { CtaBanner } from "@/components/site/cta-banner";
import { ToolkitGate } from "@/components/site/toolkit-gate";
import { ToolkitActions } from "@/components/site/toolkit-actions";
import { TEMPLATES, TOOLKIT_COOKIE, type Template } from "@/lib/it-toolkit";

export const metadata: Metadata = {
  title: "Free IT toolkit for small businesses",
  description: "An acceptable use policy, a backup health checklist and an incident response one-pager. Free to use and adapt.",
};

const ICONS: Record<string, typeof FileText> = {
  "acceptable-use": ShieldCheck,
  "backup-checklist": HardDrive,
  "incident-response": ShieldAlert,
};

const plain = (t: Template) =>
  [t.title, "", ...t.sections.flatMap((s) => [s.heading, ...s.items.map((i) => `- ${i}`), ""])].join("\n").trim();

export default async function ToolkitPage() {
  const unlocked = (await cookies()).get(TOOLKIT_COOKIE)?.value === "1";
  return (
    <>
      <PageHeader
        eyebrow="Free templates"
        title="IT toolkit for small businesses"
        description="Three ready-to-use documents. Adapt the bracketed parts, print them, and put them to work."
        breadcrumbs={[{ label: "Resources", href: "/resources" }, { label: "IT toolkit" }]}
      />
      <Section>
        {!unlocked ? (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
            <ul className="space-y-4">
              {TEMPLATES.map((t) => {
                const Icon = ICONS[t.id] ?? FileText;
                const count = t.sections.reduce((n, s) => n + s.items.length, 0);
                return (
                  <li key={t.id} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold">{t.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t.sections.length} sections · {count} points
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <ToolkitGate />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-10">
            <nav aria-label="Templates" className="flex flex-wrap gap-2 print:hidden">
              {TEMPLATES.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-foreground/30"
                >
                  {t.title}
                </a>
              ))}
            </nav>
            {TEMPLATES.map((t) => {
              const Icon = ICONS[t.id] ?? FileText;
              return (
                <article
                  key={t.id}
                  id={t.id}
                  className="scroll-mt-28 break-inside-avoid rounded-2xl border border-border bg-card p-6 sm:p-8 print:break-after-page print:border-0 print:p-0"
                >
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent print:hidden">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h2 className="font-display text-2xl font-semibold">{t.title}</h2>
                        <p className="mt-1 text-muted-foreground">{t.blurb}</p>
                      </div>
                    </div>
                    <ToolkitActions text={plain(t)} />
                  </header>
                  {t.sections.map((s, n) => (
                    <div key={s.heading} className="mt-7">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs">{n + 1}</span>
                        {s.heading}
                      </h3>
                      <ul className="mt-3 space-y-2 border-l-2 border-border pl-4">
                        {s.items.map((i) => (
                          <li key={i} className="leading-relaxed">
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </article>
              );
            })}
            <p className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground print:hidden">
              Want these tailored to your business and reviewed against the Data Protection Act? See our IT Policies &amp; Compliance Pack.
            </p>
          </div>
        )}
      </Section>
      <CtaBanner />
    </>
  );
}
