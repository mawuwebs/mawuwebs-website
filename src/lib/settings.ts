import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type Metric = { label: string; value: string };
export type TrustLogo = { name: string; image: string };

const DEFAULTS = {
  id: "main",
  siteName: "Mawuwebs Solutions",
  tagline: "IT Solutions & Digital Services",
  logo: null as string | null,
  favicon: null as string | null,
  contactEmail: "hello@mawuwebs.com",
  phone: "+1 (555) 123-4567",
  address: "123 Innovation Drive, Suite 400, Tech City, TC 10101",
  mapEmbedUrl: null as string | null,
  footerText: "IT support, infrastructure, security and software for growing businesses.",
  heroHeadline: "IT Solutions That Keep Your Business Running and Growing",
  heroSubheading:
    "From websites and apps to networks, security and everyday IT support, we look after the technology so you can focus on your business.",
  heroCtaPrimaryText: "Start a Project",
  heroCtaPrimaryUrl: "/start-a-project",
  heroCtaSecondaryText: "View Our Work",
  heroCtaSecondaryUrl: "/portfolio",
  heroImage: null as string | null,
  metrics: "[]",
  newsletterEnabled: true,
  bookingUrl: null as string | null,
  whatsapp: null as string | null,
  serviceArea: null as string | null,
  googleVerification: null as string | null,
  bingVerification: null as string | null,
  supportPromise: null as string | null,
  trustLogos: "[]",
};

export const getSiteSettings = cache(async () => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: DEFAULTS,
  });

  let metrics: Metric[] = [];
  try {
    metrics = JSON.parse(settings.metrics);
  } catch {
    metrics = [];
  }

  let trustLogosList: TrustLogo[] = [];
  try {
    trustLogosList = JSON.parse(settings.trustLogos);
  } catch {
    trustLogosList = [];
  }

  return { ...settings, metricsList: metrics, trustLogosList };
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({ orderBy: { order: "asc" } });
});
