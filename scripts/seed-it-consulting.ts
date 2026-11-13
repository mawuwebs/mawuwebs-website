// Usage: npm run db:seed-consulting
// Adds the fixed-price IT audit and advisory services. Safe to re-run: existing rows are left alone
// (edit them in the admin), only missing ones are created.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

const list = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

const SERVICES = [
  {
    title: "IT Security Audit",
    slug: "it-security-audit",
    icon: "ShieldCheck",
    category: "Infrastructure & Security",
    order: 20,
    description: "A fixed-price review of your accounts, devices, email and data protection, with a ranked fix list.",
    content: `<p>Find out where you are exposed before an attacker does. We review how your business is actually set up and give you a plain-language report with the fixes ranked by risk.</p><h2>What's included</h2>${list([
      "Account and password review, including two-step sign-in coverage",
      "Email security: spoofing, phishing protection and mailbox rules",
      "Device and patching review across computers and phones",
      "Backup and data-protection check",
      "Ranked findings report and a 45-minute walkthrough",
    ])}<h2>How it works</h2><p>A short questionnaire, a half-day on site or remote, then your report within five working days. Fixed price, agreed before we start.</p>`,
  },
  {
    title: "Network & Wi-Fi Audit",
    slug: "network-wifi-audit",
    icon: "Network",
    category: "Infrastructure & Security",
    order: 21,
    description: "Find out why your network is slow or unreliable, and what to change, with a costed plan.",
    content: `<p>Slow Wi-Fi and dropped connections cost hours every week. We test the network, map the problems and tell you exactly what to fix.</p><h2>What's included</h2>${list([
      "Wi-Fi coverage and speed testing across the premises",
      "Router, switch and firewall configuration review",
      "Guest and staff network separation check",
      "Cabling and equipment condition check",
      "Costed improvement plan, in priority order",
    ])}`,
  },
  {
    title: "Cloud & Email Setup Review",
    slug: "cloud-email-setup-review",
    icon: "Cloud",
    category: "Support & Advisory",
    order: 22,
    description: "A review of your Microsoft 365 or Google Workspace setup for cost, security and tidiness.",
    content: `<p>Most businesses pay for more than they use and protect less than they think. We review your workspace and fix what is wasteful or risky.</p><h2>What's included</h2>${list([
      "Licence and subscription review, with savings identified",
      "Security settings, sharing and admin-role review",
      "Email domain setup: SPF, DKIM and DMARC",
      "Storage structure and shared-drive clean-up advice",
      "Written summary of changes and savings",
    ])}`,
  },
  {
    title: "Backup & Recovery Review",
    slug: "backup-recovery-review",
    icon: "HardDrive",
    category: "Infrastructure & Security",
    order: 23,
    description: "We test whether your backups actually restore, and whether the business could carry on after a failure.",
    content: `<p>Backups only matter on the day you need them. We check yours work and that you have a plan for the day they are needed.</p><h2>What's included</h2>${list([
      "What is backed up, what is missing and where copies live",
      "Live restore test of real files",
      "Recovery time and data-loss risk assessment",
      "One-page continuity plan for your key systems",
      "Fix recommendations with costs",
    ])}`,
  },
  {
    title: "Virtual IT Manager",
    slug: "virtual-it-manager",
    icon: "Briefcase",
    category: "Support & Advisory",
    order: 24,
    description: "An experienced IT lead on call each month: planning, vendor decisions, budgets and oversight, without a full-time hire.",
    content: `<p>You get the judgement of an IT manager for a fraction of the cost. We own the plan, watch the risks and make sure technology supports the business.</p><h2>What's included</h2>${list([
      "Monthly review call and written IT report",
      "Technology roadmap and annual IT budget",
      "Vendor, contract and purchase advice",
      "Oversight of your support provider and projects",
      "Priority access for urgent decisions",
    ])}<p>Available as a monthly retainer or by the hour.</p>`,
  },
  {
    title: "IT Policies & Compliance Pack",
    slug: "it-policies-compliance-pack",
    icon: "Briefcase",
    category: "Support & Advisory",
    order: 25,
    description: "Written IT policies and data-protection basics tailored to your business, ready to use with your team.",
    content: `<p>Clear rules protect your data and your business. We write the policies you need and help you put them into practice.</p><h2>What's included</h2>${list([
      "Acceptable use, password and remote-working policies",
      "Data-protection basics aligned to the Ghana Data Protection Act",
      "Incident response and breach-reporting plan",
      "Staff sign-off sheet and short briefing",
    ])}`,
  },
];

const ADVISORY_PLAN = {
  slug: "advisory",
  name: "Advisory",
  tagline: "An IT manager on call, without the hire",
  forWho: "Businesses that already have day-to-day support but need someone to own the plan, the budget and the risks.",
  features: JSON.stringify([
    "Monthly review call and written IT report",
    "Technology roadmap and annual IT budget",
    "Vendor, contract and purchase advice",
    "Oversight of your support provider and projects",
    "Policies and compliance guidance",
  ]),
  order: 3,
};

async function main() {
  await prisma.plan.upsert({
    where: { slug: ADVISORY_PLAN.slug },
    update: {},
    create: { ...ADVISORY_PLAN, status: "PUBLISHED", highlight: false, publishedAt: new Date() },
  });
  console.log("plan advisory: ok");
  for (const s of SERVICES) {
    const row = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        ...s,
        status: "PUBLISHED",
        featured: false,
        publishedAt: new Date(),
        metaTitle: `${s.title} | Mawuwebs Solutions`,
        metaDescription: s.description,
      },
    });
    console.log(`${row.slug}: ok`);
  }
}

main().finally(() => prisma.$disconnect());
