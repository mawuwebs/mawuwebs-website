import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, CalendarDays } from "lucide-react";
import { Illustration } from "@/components/site/illustrations";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { ContactForm } from "@/components/site/contact-form";
import { SocialIcon } from "@/components/site/social-icon";
import { getSiteSettings, getSocialLinks } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Mawuwebs Solutions team to start your next project.",
};

export default async function ContactPage() {
  const [settings, socials] = await Promise.all([getSiteSettings(), getSocialLinks()]);

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's start a conversation"
        description="Have a project in mind? Fill out the form below or reach out directly — we'd love to hear from you."
        illustration={<Illustration variant="chat" className="h-full w-full" />}
      />

      <Section>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold">Get in touch</h2>
            <p className="mt-3 text-muted-foreground">
              Prefer email or phone? Reach us directly using the details below.
            </p>

            {settings.bookingUrl && (
              <a
                href={settings.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-accent"
              >
                <CalendarDays className="size-4 text-accent" />
                Rather talk? Book a 15-minute call
              </a>
            )}

            <ul className="mt-8 space-y-6">
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="font-medium hover:text-accent"
                  >
                    {settings.contactEmail}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                    className="font-medium hover:text-accent"
                  >
                    {settings.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Office</p>
                  <p className="font-medium">{settings.address}</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Working hours</p>
                  <p className="font-medium">Mon &ndash; Fri, 9am &ndash; 6pm</p>
                </div>
              </li>
            </ul>

            {socials.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                    className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-forest hover:text-white"
                  >
                    <SocialIcon platform={s.platform} className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <ContactForm />
          </div>
        </div>
      </Section>

      {settings.mapEmbedUrl && (
        <Section className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              src={settings.mapEmbedUrl}
              title="Office location map"
              className="h-96 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Section>
      )}
    </>
  );
}
