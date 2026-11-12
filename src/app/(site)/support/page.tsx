import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { Section } from "@/components/site/container";
import { SupportForm } from "@/components/site/support-form";
import { whatsappHref } from "@/components/site/quick-contact";
import { getSiteSettings } from "@/lib/settings";
import { getSupportConfig } from "@/lib/form-config";

export const metadata: Metadata = {
  title: "Get IT support",
  description:
    "Something broken? Tell us what's wrong and a technician will get back to you. Computers, email, networks, printers and security.",
};

export default async function SupportPage() {
  const [settings, supportConfig] = await Promise.all([getSiteSettings(), getSupportConfig()]);
  return (
    <>
      <PageHeader
        eyebrow="IT support"
        title="Something not working? Tell us."
        description="Describe the problem and how urgent it is. A technician will contact you. For emergencies, call or message us straight away."
        illustration={<Illustration variant="chat" className="h-full w-full" />}
      />
      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_0.8fr] lg:gap-16">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
            <SupportForm config={supportConfig} />
          </div>
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-forest p-6 text-white">
              <h2 className="font-display text-lg font-semibold">Need us right now?</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-3 hover:text-yellow">
                    <Phone className="size-4 shrink-0 text-orange" />
                    {settings.phone}
                  </a>
                </li>
                {settings.whatsapp && (
                  <li>
                    <a
                      href={whatsappHref(settings.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center gap-3 hover:text-yellow"
                    >
                      <MessageCircle className="size-4 shrink-0 text-orange" />
                      Message us on WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-base font-semibold">What happens next</h2>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                {["You send the form. It takes about a minute.", "A technician reads it and contacts you.", "We fix it, or tell you exactly what's needed."].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-white">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            {(settings.supportPromise || settings.serviceArea) && (
              <ul className="space-y-4 text-sm">
                {settings.supportPromise && (
                  <li className="flex gap-3">
                    <Clock className="mt-0.5 size-4 shrink-0 text-accent" />
                    {settings.supportPromise}
                  </li>
                )}
                {settings.serviceArea && (
                  <li className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                    {settings.serviceArea}
                  </li>
                )}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              Looking for ongoing cover for your whole team? See our{" "}
              <Link href="/plans" className="font-medium text-accent underline underline-offset-4">
                managed IT plans
              </Link>
              .
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
