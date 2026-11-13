// Usage: npx tsx --env-file=.env scripts/seed-sample-invoices.ts
// Adds sample clients and invoices (draft, sent, part-paid, paid, overdue, void). Re-runnable: skips if SAMPLE tokens exist.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { formatDocNumber } from "../src/lib/billing";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });
const day = 864e5;
const ago = (d: number) => new Date(Date.now() - d * day);

const clients = [
  { email: "ama@sampletrading.example", name: "Ama Mensah", company: "Sample Trading Ltd", phone: "+233244000001" },
  { email: "kofi@bluepalm.example", name: "Kofi Boateng", company: "Blue Palm Hotel", phone: "+233244000002" },
  { email: "efua@kemaclinic.example", name: "Efua Owusu", company: "Kema Clinic", phone: "+233244000003" },
  { email: "yaw@accrasolar.example", name: "Yaw Adjei", company: "Accra Solar", phone: "+233244000004" },
];

type Spec = { c: number; title: string; status: "DRAFT" | "SENT" | "PAID" | "VOID"; issue: number; due: number | null; tax: number; items: [string, number, number][]; paid?: number[]; method?: string };
const specs: Spec[] = [
  { c: 0, title: "Business website and email setup", status: "SENT", issue: 5, due: -9, tax: 1500, items: [["Website design and build (5 pages)", 1, 450000], ["Business email (per mailbox)", 3, 25000], ["Annual hosting and domain", 1, 90000]], paid: [300000], method: "momo" },
  { c: 1, title: "Booking system integration", status: "PAID", issue: 40, due: 26, tax: 1500, items: [["Booking engine integration", 1, 800000], ["Staff training (hours)", 4, 15000]], paid: [860000 + 129000], method: "bank" },
  { c: 2, title: "Patient portal – phase 1", status: "SENT", issue: 45, due: 31, tax: 0, items: [["Portal build", 1, 1200000]] },
  { c: 3, title: "Monthly managed IT – October", status: "PAID", issue: 20, due: 6, tax: 1500, items: [["Managed IT plan", 1, 150000]], paid: [172500], method: "momo" },
  { c: 3, title: "Monthly managed IT – November", status: "SENT", issue: 2, due: -12, tax: 1500, items: [["Managed IT plan", 1, 150000]] },
  { c: 0, title: "SEO audit and fixes", status: "DRAFT", issue: 0, due: null, tax: 1500, items: [["SEO audit", 1, 120000], ["Technical fixes (hours)", 6, 20000]] },
  { c: 1, title: "Logo refresh (cancelled)", status: "VOID", issue: 60, due: 46, tax: 0, items: [["Logo refresh", 1, 90000]] },
  { c: 2, title: "Domain and hosting renewal", status: "PAID", issue: 90, due: 76, tax: 0, items: [["Annual hosting and domain", 1, 90000]], paid: [90000], method: "cash" },
];

async function main() {
  if (await prisma.invoice.count({ where: { token: { startsWith: "sample-" } } })) { console.log("Sample invoices already exist."); return; }
  const users = [];
  for (const c of clients) {
    users.push(await prisma.user.upsert({ where: { email: c.email }, update: {}, create: { ...c, passwordHash: "!", role: "CLIENT" as never } as never }));
  }
  const year = new Date().getFullYear();
  for (const [i, s] of specs.entries()) {
    const seq = await prisma.sequence.upsert({ where: { key: `invoice-${year}` }, create: { key: `invoice-${year}`, value: 1 }, update: { value: { increment: 1 } } });
    const sent = s.status !== "DRAFT";
    await prisma.invoice.create({
      data: {
        number: formatDocNumber("INV", year, seq.value), userId: users[s.c].id, title: s.title, currency: "GHS", taxBp: s.tax,
        status: s.status, token: `sample-${i + 1}-${Math.random().toString(36).slice(2, 10)}`,
        issueDate: ago(s.issue), dueDate: s.due === null ? null : ago(s.due), sentAt: sent ? ago(s.issue) : null,
        paidAt: s.status === "PAID" ? ago(Math.max(s.issue - 5, 0)) : null,
        items: { create: s.items.map(([description, quantity, unitAmount], p) => ({ description, quantity, unitAmount, position: p })) },
        payments: { create: (s.paid ?? []).map((amount) => ({ amount, method: s.method ?? "bank", reference: "SAMPLE-" + Math.floor(Math.random() * 1e5), paidAt: ago(Math.max(s.issue - 5, 0)) })) },
      },
    });
  }
  console.log("Created", specs.length, "invoices for", users.length, "clients.");
}
main().finally(() => prisma.$disconnect());
