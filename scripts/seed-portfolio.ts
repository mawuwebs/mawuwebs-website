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

async function main() {
  const cats: Record<string, string> = {};
  for (const name of new Set(items.map((i) => i.cat))) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const c = await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, type: "PROJECT" } }).catch(async () => (await prisma.category.findFirstOrThrow({ where: { name, type: "PROJECT" } })));
    cats[name] = c.id;
  }
  for (const [i, p] of items.entries()) {
    const data = {
      title: p.title, description: p.desc, content: `<p>${p.desc}</p>`,
      featuredImage: p.img ? `/images/portfolio/${p.img}.jpg` : null,
      client: p.client, projectUrl: p.url, year: p.year, role: p.role,
      status: "PUBLISHED" as const, featured: p.featured, order: i - 20, categoryId: cats[p.cat],
      metaTitle: `${p.title} | Mawuwebs Solutions Portfolio`, metaDescription: p.desc, publishedAt: new Date(),
    };
    await prisma.project.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
    console.log("ok", p.slug);
  }
}
main().finally(() => prisma.$disconnect());
