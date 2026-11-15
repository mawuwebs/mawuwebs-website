// Usage: npx tsx --env-file=.env scripts/seed-sample-work.ts
// Adds sample client projects (tasks, milestones, time, comments), expenses and recurring expenses.
// Re-runnable: skips if projects titled with the SAMPLE marker exist.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });
const day = 864e5;
const ago = (d: number) => new Date(Date.now() - d * day);
const MARK = "[sample]";

const clients = [
  { email: "ama@sampletrading.example", name: "Ama Mensah", company: "Sample Trading Ltd", phone: "+233244000001" },
  { email: "kofi@bluepalm.example", name: "Kofi Boateng", company: "Blue Palm Hotel", phone: "+233244000002" },
  { email: "efua@kemaclinic.example", name: "Efua Owusu", company: "Kema Clinic", phone: "+233244000003" },
  { email: "yaw@accrasolar.example", name: "Yaw Adjei", company: "Accra Solar", phone: "+233244000004" },
];

type T = [title: string, status: "TODO" | "DOING" | "REVIEW" | "DONE", priority: number, due: number | null, visible: boolean];
type M = [title: string, due: number, done: boolean];
type P = {
  c: number; title: string; summary: string; status: "PLANNING" | "IN_PROGRESS" | "REVIEW" | "ON_HOLD" | "DONE";
  start: number; due: number; rate: number; budgetH: number; fixed: number; milestones: M[]; tasks: T[]; hours: [days: number, min: number, note: string, billable: boolean][];
};

const projects: P[] = [
  { c: 0, title: "Business website and email setup", summary: "5-page marketing site, branded email for 3 staff.", status: "IN_PROGRESS", start: 21, due: -14, rate: 15000, budgetH: 40, fixed: 0,
    milestones: [["Design approved", 14, true], ["Build complete", -3, false], ["Launch", -14, false]],
    tasks: [["Homepage design", "DONE", 2, 14, true], ["Inner pages build", "DOING", 2, -3, true], ["Mailbox setup", "TODO", 1, -7, true], ["Contact form + spam guard", "REVIEW", 1, 0, false], ["DNS cutover", "TODO", 2, -14, false]],
    hours: [[20, 180, "Discovery call and sitemap", true], [16, 300, "Homepage design", true], [9, 240, "Page templates", true], [3, 150, "Contact form", true], [1, 60, "Internal QA", false]] },
  { c: 1, title: "Booking system integration", summary: "Connect hotel booking engine to site and payments.", status: "REVIEW", start: 60, due: 5, rate: 18000, budgetH: 50, fixed: 800000,
    milestones: [["API access", 50, true], ["Integration live in staging", 20, true], ["Client sign-off", -5, false]],
    tasks: [["Engine API credentials", "DONE", 1, 50, true], ["Room availability sync", "DONE", 2, 30, true], ["Payment flow", "DONE", 2, 15, true], ["Staff training session", "TODO", 1, -4, true]],
    hours: [[45, 240, "API discovery", true], [30, 420, "Availability sync", true], [14, 360, "Payment flow", true], [6, 120, "Bug fixes", true]] },
  { c: 2, title: "Patient portal – phase 1", summary: "Secure appointment requests and results notifications.", status: "PLANNING", start: 3, due: -60, rate: 20000, budgetH: 80, fixed: 1200000,
    milestones: [["Requirements signed off", -7, false], ["Prototype", -25, false]],
    tasks: [["Gather requirements", "DOING", 2, -5, true], ["Data protection review", "TODO", 2, -10, false], ["Wireframes", "TODO", 1, -20, true]],
    hours: [[3, 90, "Kickoff workshop", true]] },
  { c: 3, title: "Managed IT – monthly retainer", summary: "Monitoring, patching and helpdesk for 12 staff.", status: "IN_PROGRESS", start: 120, due: -240, rate: 0, budgetH: 10, fixed: 150000,
    milestones: [],
    tasks: [["Patch Tuesday updates", "DONE", 1, 8, true], ["Backup restore test", "DOING", 2, -2, true], ["Replace failing router", "TODO", 2, 3, true], ["Review MFA coverage", "TODO", 1, -9, false]],
    hours: [[25, 120, "Patching", true], [18, 60, "Helpdesk tickets", true], [10, 150, "Network audit", true], [4, 90, "Helpdesk tickets", true]] },
  { c: 0, title: "SEO audit and fixes", summary: "Technical audit and on-page fixes.", status: "DONE", start: 90, due: 40, rate: 12000, budgetH: 12, fixed: 0,
    milestones: [["Audit delivered", 70, true], ["Fixes shipped", 42, true]],
    tasks: [["Crawl and audit", "DONE", 1, 70, true], ["Fix titles and meta", "DONE", 1, 55, true], ["Submit sitemap", "DONE", 0, 45, true]],
    hours: [[85, 180, "Audit", true], [60, 240, "Fixes", true], [44, 60, "Sitemap + reporting", true]] },
  { c: 1, title: "Staff intranet refresh", summary: "Paused until the hotel renovation finishes.", status: "ON_HOLD", start: 30, due: -90, rate: 15000, budgetH: 30, fixed: 0,
    milestones: [["Content inventory", 10, true]],
    tasks: [["Inventory existing pages", "DONE", 0, 10, false], ["Choose platform", "TODO", 1, null, false]],
    hours: [[28, 120, "Content inventory", true]] },
];

const expenses: { cat: string; vendor: string; desc: string; amt: number; cur?: string; method: string; days: number; tax?: number; project?: number; billable?: boolean; note?: string }[] = [
  { cat: "hosting", vendor: "Hostinger", desc: "Business hosting – annual", amt: 54000, method: "card", days: 5 },
  { cat: "domains", vendor: "Namecheap", desc: "Domain renewal: bluepalm.example", amt: 14500, cur: "USD", method: "card", days: 12, project: 1, billable: true },
  { cat: "software", vendor: "Figma", desc: "Professional seat – monthly", amt: 1500, cur: "USD", method: "card", days: 8 },
  { cat: "software", vendor: "GitHub", desc: "Team plan – monthly", amt: 400, cur: "USD", method: "card", days: 9 },
  { cat: "software", vendor: "Google Workspace", desc: "3 mailboxes – monthly", amt: 4200, cur: "USD", method: "card", days: 15 },
  { cat: "contractors", vendor: "Kwame Asante", desc: "Freelance copywriting – site content", amt: 80000, method: "momo", days: 18, project: 0, billable: true, note: "Paid via MoMo" },
  { cat: "contractors", vendor: "Nana Ofori", desc: "Photography for hotel site", amt: 150000, method: "bank", days: 35, project: 1, billable: true },
  { cat: "hardware", vendor: "Compu Ghana", desc: "Replacement router", amt: 120000, method: "cash", days: 3, tax: 15660, project: 3, billable: true },
  { cat: "hardware", vendor: "Compu Ghana", desc: "USB-C dock", amt: 65000, method: "card", days: 40, tax: 8478 },
  { cat: "marketing", vendor: "Meta Ads", desc: "Lead-gen campaign", amt: 50000, method: "card", days: 22 },
  { cat: "marketing", vendor: "Canva", desc: "Pro plan – annual", amt: 12000, cur: "USD", method: "card", days: 55 },
  { cat: "travel", vendor: "Bolt", desc: "Client site visit – Kema Clinic", amt: 18000, method: "momo", days: 4, project: 2 },
  { cat: "travel", vendor: "Fuel", desc: "Trip to Accra Solar office", amt: 25000, method: "cash", days: 27, project: 3 },
  { cat: "fees", vendor: "Paystack", desc: "Gateway fees – October", amt: 9800, method: "bank", days: 14 },
  { cat: "fees", vendor: "MTN MoMo", desc: "Cash-out charges", amt: 2400, method: "momo", days: 20 },
  { cat: "tax", vendor: "GRA", desc: "Quarterly tax instalment", amt: 220000, method: "bank", days: 30 },
  { cat: "other", vendor: "Office Mart", desc: "Printer paper and toner", amt: 32000, method: "cash", days: 45 },
  { cat: "hosting", vendor: "Hostinger", desc: "VPS – quarterly", amt: 36000, method: "card", days: 70 },
];

const recurring = [
  { category: "software", vendor: "Figma", description: "Professional seat", amount: 1500, currency: "USD", intervalMonths: 1, nextIn: 17 },
  { category: "software", vendor: "GitHub", description: "Team plan", amount: 400, currency: "USD", intervalMonths: 1, nextIn: 18 },
  { category: "hosting", vendor: "Hostinger", description: "VPS", amount: 36000, currency: "GHS", intervalMonths: 3, nextIn: 20 },
  { category: "domains", vendor: "Namecheap", description: "mawuwebs domain renewal", amount: 14500, currency: "USD", intervalMonths: 12, nextIn: 90, autoRecord: false },
];

async function main() {
  if (await prisma.clientProject.count({ where: { summary: { contains: MARK } } })) { console.log("Sample work already exists."); return; }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" as never } });
  const users = [];
  for (const c of clients) users.push(await prisma.user.upsert({ where: { email: c.email }, update: {}, create: { ...c, passwordHash: "!", role: "CLIENT" as never } as never }));

  const created = [];
  for (const p of projects) {
    const ms = p.milestones;
    const proj = await prisma.clientProject.create({
      data: {
        userId: users[p.c].id, title: p.title, summary: `${p.summary} ${MARK}`, status: p.status,
        startDate: ago(p.start), dueDate: ago(p.due), hourlyRate: p.rate, budgetMinutes: p.budgetH * 60, fixedPrice: p.fixed,
        milestones: JSON.stringify(ms.map(([title, , done]) => ({ title, done }))),
        milestoneRows: { create: ms.map(([title, due, done], i) => ({ title, position: i, dueDate: ago(due), completedAt: done ? ago(due) : null, requiresApproval: i === ms.length - 1 && p.fixed > 0 && ms.length > 1, billAmount: i === ms.length - 1 && p.fixed > 0 ? Math.round(p.fixed / 2) : 0 })) },
      },
    });
    for (const [title, status, priority, due, visible] of p.tasks) {
      await prisma.task.create({ data: { projectId: proj.id, title, status, priority, dueDate: due === null ? null : ago(due), clientVisible: visible, assigneeId: admin?.id ?? null, completedAt: status === "DONE" ? ago(due ?? 0) : null } });
    }
    for (const [days, minutes, note, billable] of p.hours) {
      await prisma.timeEntry.create({ data: { projectId: proj.id, userId: admin?.id ?? null, minutes, note, billable, rateMinor: p.rate, workedOn: ago(days) } });
    }
    await prisma.projectComment.create({ data: { projectId: proj.id, userId: admin?.id ?? null, authorName: admin?.name ?? "MawuWebs", body: "Kickoff done. Next update this week.", createdAt: ago(Math.max(p.start - 2, 1)) } });
    await prisma.projectComment.create({ data: { projectId: proj.id, authorName: users[p.c].name ?? "Client", fromClient: true, body: "Thanks, looks good so far.", createdAt: ago(Math.max(p.start - 5, 1)) } });
    created.push(proj);
  }

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        category: e.cat, vendor: e.vendor, description: e.desc, amount: e.amt, currency: e.cur ?? "GHS", method: e.method, note: e.note ?? "SAMPLE",
        spentAt: ago(e.days), taxAmount: e.tax ?? 0, billable: e.billable ?? false, projectId: e.project === undefined ? null : created[e.project].id,
      },
    });
  }
  for (const r of recurring) {
    const { nextIn, ...rest } = r;
    await prisma.recurringExpense.create({ data: { ...rest, method: "card", nextRunAt: new Date(Date.now() + nextIn * day), lastRunAt: ago(30) } });
  }
  console.log(`Created ${created.length} projects, ${expenses.length} expenses, ${recurring.length} recurring.`);
}
main().finally(() => prisma.$disconnect());
