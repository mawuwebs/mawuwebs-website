import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Illustration } from "@/components/site/illustrations";
import { Section } from "@/components/site/container";
import { SupportForm } from "@/components/site/support-form";
import { whatsappHref } from "@/components/site/quick-contact";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Get IT support",
  description:
    "Something broken? Tell us what's wrong and a technician will get back to you. Computers, email, networks, printers and security.",
};

export default async function SupportPage() {
  const settings = await getSiteSettings();
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
            <SupportForm />
          </div>
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-forest p-6 text-white">
              <h2 className="font-display text-lg font-semibold">Need us right now?</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 hover:text-yellow">
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
                      className="flex items-center gap-3 hover:text-yellow"
                    >
                      <MessageCircle className="size-4 shrink-0 text-orange" />
                      Message us on WhatsApp
                    </a>
                  </li>
                )}
              </ul>
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
              <a href="/plans" className="font-medium text-accent underline underline-offset-4">
                managed IT plans
              </a>
              .
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
