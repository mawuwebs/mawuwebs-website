import { ContactTracker } from "@/components/site/contact-tracker";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { ScrollPrompt } from "@/components/site/scroll-prompt";
import { MobileCtaBar } from "@/components/site/mobile-cta-bar";
import { QuickContact } from "@/components/site/quick-contact";
import { PointerGlow } from "@/components/site/pointer-glow";
import { getSiteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";
import { ldJson } from "@/lib/sanitize";

// Content lives in the runtime DB (prod volume), so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName,
    url: siteUrl(),
    logo: settings.logo ? new URL(settings.logo, siteUrl()).toString() : undefined,
    email: settings.contactEmail,
    telephone: settings.phone,
    address: settings.address,
    areaServed: settings.serviceArea ?? undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(orgLd) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
      >
        Skip to content
      </a>
      <ContactTracker />
      <ScrollProgress />
      <PointerGlow />
      <Navbar siteName={settings.siteName} logo={settings.logo} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <QuickContact phone={settings.phone} whatsapp={settings.whatsapp} />
      <MobileCtaBar />
      {settings.newsletterEnabled && <ScrollPrompt />}
    </>
  );
}
