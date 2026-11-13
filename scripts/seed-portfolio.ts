// Usage: npx tsx --env-file=.env scripts/seed-portfolio.ts
// Adds real client/product portfolio entries. Re-runnable (upserts by slug).
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

type E = { slug: string; title: string; client: string; cat: string; url: string | null; img: string | null; desc: string; featured: boolean; year: string; role: string };
const items: E[] = [
  { slug: "iris-emr", title: "Iris EMR", client: "Tamale Eye Hospital", cat: "Software Product", url: "https://irisemr.cloud/", img: "irisemr-cloud",
    desc: "A cloud electronic medical records system built for Tamale Eye Hospital, with secure staff sign-in and patient records in one place.", featured: true, year: "2026", role: "Product design and development" },
  { slug: "midnight-pos", title: "Midnight POS (coming soon)", client: "Mawuwebs product", cat: "Software Product", url: null, img: "irisemr-crm",
    desc: "One of our flagship products, not yet launched. Point of sale, inventory, accounting, HR and CRM in one platform for retailers across Ghana and West Africa.", featured: true, year: "2026", role: "Product design and development" },
  { slug: "medflow-emr", title: "MedFlow EMR", client: "Dei Gratial Medical Services", cat: "Software Product", url: null, img: "medflow-emr",
    desc: "An electronic medical records system for general hospitals, currently in use at Dei Gratial Medical Services in Tamale.", featured: true, year: "2026", role: "Product design and development" },
  { slug: "tamale-eye-hospital-website", title: "Tamale Eye Hospital Website", client: "Tamale Eye Hospital", cat: "Website", url: "https://tamaleeyehospital.com/", img: "tamale-eye-hospital",
    desc: "Website for a leading eye care provider in northern Ghana, covering services, a blog and patient contact.", featured: true, year: "2025", role: "Design and development" },
  { slug: "right-to-sight-and-health", title: "Right to Sight and Health", client: "Right to Sight and Health", cat: "Website", url: "https://righttosightandhealth.org/", img: "right-to-sight-and-health",
    desc: "Website for a non-profit building a sustainable eye care network in northern Ghana, with donation calls to action.", featured: false, year: "2025", role: "Design and development" },
  { slug: "northwell-group", title: "Northwell Group", client: "Northwell Group", cat: "Website", url: "https://northwellgroup.com/", img: "northwell-group",
    desc: "Corporate website for a construction and real estate group, presenting its subsidiaries and media centre.", featured: false, year: "2025", role: "Design and development" },
  { slug: "casablanca-real-estate", title: "Casablanca Real Estate", client: "Casablanca Real Estates Limited", cat: "Website", url: "https://casablancarlestate.com/", img: "casablanca-real-estate",
    desc: "Website for a road and building construction contractor, showing projects, developments, plant fleet and quote requests.", featured: false, year: "2026", role: "Design and development" },
  { slug: "pinnacle-star-academy", title: "Pinnacle Star Academy", client: "Pinnacle Star Academy", cat: "Website", url: "https://thepinnacle.edu.gh/", img: "pinnacle-star-academy",
    desc: "Website for a private school in Kanvili, Tamale, with academics, parent information, gallery and achievements.", featured: false, year: "2024", role: "Design and development" },
  { slug: "posh-clean-services", title: "Posh Clean Services", client: "Posh Clean Services", cat: "Website", url: "https://poshcleangh.com/", img: "posh-clean",
    desc: "Lead-generation website for a cleaning and fumigation company serving all 16 regions of Ghana.", featured: false, year: "2026", role: "Design, development and SEO" },
  { slug: "faryond", title: "Faryond Limited", client: "Faryond Limited", cat: "Website", url: "https://faryond.africa/", img: "faryond",
    desc: "Corporate website for a provider of liquid oxygen (LOX) solutions for healthcare and industry across Africa.", featured: false, year: "2025", role: "Design and development" },
  { slug: "djas-support-services", title: "Djas Support Services", client: "Djas Support Services", cat: "Website", url: "https://djass.co.uk/", img: "djass",
    desc: "Website for a UK construction services company, with quote requests and job opportunities.", featured: false, year: "2025", role: "Design and development" },
];


// Extra case-study copy. Only facts visible on the live sites; no invented metrics.
const more: Record<string, { tags: string[]; gallery?: string[]; challenge?: string; solution?: string; results?: [string, string][]; link?: string }> = {
  "iris-emr": { tags: ["Healthcare", "EMR", "Cloud"], challenge: "An eye hospital needs patient records, clinics and billing in one secure system that every department can use.", solution: "We built Iris as a cloud EMR with role-based staff sign-in, so clinical teams work from the same patient record.", link: "tamale-eye-hospital-website" },
  "midnight-pos": { tags: ["Retail", "POS", "Fintech"], gallery: ["midnight-pos-2", "midnight-pos-mobile"], challenge: "Retailers in Ghana and West Africa juggle separate tools for sales, stock, accounts, staff and customers, often on weak connections.", solution: "Midnight POS combines point of sale, inventory, accounting, HR and CRM in one platform, with Mobile Money support and multi-store inventory." },
  "medflow-emr": { tags: ["Healthcare", "EMR", "Hospital"], challenge: "A general hospital needs outpatient, ward, laboratory, pharmacy and billing work joined up in one record.", solution: "MedFlow is our EMR for general hospitals. It is live at Dei Gratial Medical Services in Tamale." },
  "tamale-eye-hospital-website": { tags: ["WordPress", "Healthcare"], gallery: ["tamale-eye-hospital-2", "tamale-eye-hospital-mobile"], challenge: "Patients needed a clear place to learn about services and reach the hospital.", solution: "A fast, mobile-friendly WordPress site with services, a blog and contact details. The hospital's records run on Iris EMR.", link: "iris-emr" },
  "right-to-sight-and-health": { tags: ["WordPress", "Non-profit"], gallery: ["right-to-sight-and-health-2", "right-to-sight-and-health-mobile"], challenge: "A non-profit needed to explain its mission and make giving simple.", solution: "A site that tells the story of the northern Ghana eye care network, with clear donation calls to action." },
  "northwell-group": { tags: ["WordPress", "Construction", "Real estate"], gallery: ["northwell-group-2", "northwell-group-mobile"], challenge: "A group of companies needed one credible home for its subsidiaries and news.", solution: "A corporate site with a page for each subsidiary and a media centre.", results: [["2015", "Operating since, as stated on the site"]] },
  "casablanca-real-estate": { tags: ["WordPress", "Construction"], gallery: ["casablanca-real-estate-2", "casablanca-real-estate-mobile"], challenge: "A road and building contractor needed to show its capability to large public and private clients.", solution: "A site covering services, projects, developments and plant equipment, with quote requests and a downloadable company profile.", results: [["117", "Permanent staff, as stated on the site"]] },
  "pinnacle-star-academy": { tags: ["WordPress", "Education"], gallery: ["pinnacle-star-academy-2", "pinnacle-star-academy-mobile"], challenge: "A private school needed to give parents clear information in one place.", solution: "A site covering about, academics, parents, gallery and achievements." },
  "posh-clean-services": { tags: ["WordPress", "SEO", "Lead generation"], gallery: ["posh-clean-2", "posh-clean-mobile"], challenge: "A cleaning company serving the whole country needed to be found by search and turn visits into quote requests.", solution: "A search-optimised site with service and area pages and a free-quote call to action.", results: [["16", "Regions of Ghana served"], ["2009", "In business since"]] },
  "faryond": { tags: ["WordPress", "Healthcare", "Industrial"], gallery: ["faryond-2", "faryond-mobile"], challenge: "A liquid oxygen provider needed to present complex infrastructure services to healthcare and industry buyers.", solution: "A corporate site with company profile, services, products and news." },
  "djas-support-services": { tags: ["WordPress", "Construction"], gallery: ["djass-2", "djass-mobile"], challenge: "A UK construction firm needed to win quotes and recruit staff online.", solution: "A site with services, a mission statement, job opportunities and quote requests." },
};

async function main() {
  const cats: Record<string, string> = {};
  for (const name of new Set(items.map((i) => i.cat))) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const c = await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, type: "PROJECT" } }).catch(async () => (await prisma.category.findFirstOrThrow({ where: { name, type: "PROJECT" } })));
    cats[name] = c.id;
  }
  const titleOf = Object.fromEntries(items.map((i) => [i.slug, i.title]));
  for (const [i, p] of items.entries()) {
    const m = more[p.slug];
    const tags = [];
    for (const name of m?.tags ?? []) {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      tags.push({ id: (await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } })).id });
    }
    const link = m?.link ? `<p>Related: <a href="/portfolio/${m.link}">${titleOf[m.link]}</a>.</p>` : "";
    const data = {
      title: p.title, description: p.desc, content: `<p>${p.desc}</p>${link}`,
      challenge: m?.challenge ?? "", solution: m?.solution ?? "",
      results: JSON.stringify((m?.results ?? []).map(([value, label]) => ({ value, label }))),
      gallery: JSON.stringify((m?.gallery ?? []).map((g) => `/images/portfolio/${g}.jpg`)),
      featuredImage: p.img ? `/images/portfolio/${p.img}.jpg` : null,
      client: p.client, projectUrl: p.url, year: p.year, role: p.role,
      status: "PUBLISHED" as const, featured: p.featured, order: i - 20, categoryId: cats[p.cat],
      metaTitle: `${p.title} | Mawuwebs Solutions Portfolio`, metaDescription: p.desc, publishedAt: new Date(),
    };
    await prisma.project.upsert({ where: { slug: p.slug }, update: { ...data, tags: { set: tags } }, create: { slug: p.slug, ...data, tags: { connect: tags } } });
    console.log("ok", p.slug);
  }
}
main().finally(() => prisma.$disconnect());
