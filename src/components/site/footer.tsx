import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Container } from "@/components/site/container";
import { SocialIcon } from "@/components/site/social-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Logo } from "@/components/site/logo";
import { getSiteSettings, getSocialLinks } from "@/lib/settings";

const FOOTER_COLUMNS = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/portfolio", label: "Portfolio" },
      { href: "/blog", label: "Insights" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Help me decide",
    links: [
      { href: "/estimate", label: "Estimate my project" },
      { href: "/resources", label: "Free resources" },
      { href: "/resources/website-launch-checklist", label: "Launch checklist" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services", label: "All Services" },
      { href: "/support", label: "Get IT Support" },
      { href: "/plans", label: "Managed IT Plans" },
      { href: "/it-health-check", label: "Free IT Health Check" },
      { href: "/book-a-call", label: "Book a Free Call" },
      { href: "/start-a-project", label: "Start a Project" },
      { href: "/portal/login", label: "Client Login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
    ],
  },
];

export async function Footer() {
  const [settings, socials] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
  ]);

  return (
    <footer className="border-t border-border bg-forest text-white dark:bg-card">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" aria-label={settings.siteName}>
              <Logo height={80} name={settings.siteName} nameClassName="text-white" accentClassName="text-[#f5a623]" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              {settings.footerText}
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-orange" />
                <a href={`mailto:${settings.contactEmail}`} className="inline-block py-1 hover:text-white">
                  {settings.contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-orange" />
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="inline-block py-1 hover:text-white">
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-orange" />
                <span>{settings.address}</span>
              </li>
              {settings.serviceArea && (
                <li className="text-white/60">Serving: {settings.serviceArea}</li>
              )}
            </ul>
            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                    className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:-translate-y-1 hover:bg-orange hover:text-forest"
                  >
                    <SocialIcon platform={s.platform} className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="font-display text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-block py-1.5 text-white/70 transition-all duration-200 hover:translate-x-1 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {settings.newsletterEnabled && (
          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Stay in the loop
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Occasional tips on IT, security, web and growth. No spam.
              </p>
            </div>
            <NewsletterForm className="w-full max-w-sm" />
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/60 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Proudly powered by</span>
            <a
              href="https://mawuwebs.cloud"
              className="inline-flex min-h-6 items-center font-semibold tracking-tight text-white transition-colors hover:text-[var(--brand-orange)] focus-visible:text-[var(--brand-orange)]"
            >
              mawu<span className="text-[var(--brand-orange)]">WEBS</span>
            </a>
          </p>
                  </div>
      </Container>
    </footer>
  );
}
