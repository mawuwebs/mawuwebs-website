// Usage: npx tsx --env-file=.env scripts/seed-sample-tickets.ts
// Adds sample support tickets with replies, linked to the sample client projects. Re-runnable.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });
const ago = (h: number) => new Date(Date.now() - h * 36e5);
const MARK = "[sample]";

type R = [staff: string | null, body: string, hoursAgo: number, internal?: boolean];
const specs: { email: string; project?: string; subject: string; body: string; urgent?: boolean; status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED"; h: number; replies: R[] }[] = [
  { email: "ama@sampletrading.example", project: "Business website and email setup", subject: "Contact form emails not arriving", body: "Test submissions from the contact page never reach our inbox. We may be losing leads.", urgent: true, status: "OPEN", h: 5, replies: [] },
  { email: "kofi@bluepalm.example", project: "Booking system integration", subject: "Guests see wrong room price", body: "The deluxe room shows GHS 450 on the site but 520 in the booking engine.", status: "IN_PROGRESS", h: 50, replies: [["MawuWebs", "Thanks, reproduced. The tax rate is applied twice on the site. Fixing today.", 40], [null, "Great, please tell us when it is live.", 30], ["MawuWebs", "Cached rates need a purge first.", 28, true]] },
  { email: "efua@kemaclinic.example", project: "Patient portal – phase 1", subject: "Can we add Twi language support?", body: "Many of our patients prefer Twi. Is a language switch possible in phase 1?", status: "WAITING", h: 96, replies: [["MawuWebs", "Possible, but it adds about 2 weeks. Do you want a quote for it as a separate item?", 80]] },
  { email: "yaw@accrasolar.example", project: "Managed IT – monthly retainer", subject: "Office wifi dropping every afternoon", body: "Wifi drops for about 10 minutes around 2pm daily. Staff on video calls are affected.", urgent: true, status: "IN_PROGRESS", h: 20, replies: [["MawuWebs", "Looks like the old router overheating. New one is scheduled for replacement this week.", 12], ["MawuWebs", "Order placed with Compu Ghana.", 11, true]] },
  { email: "ama@sampletrading.example", subject: "Please update our opening hours", body: "We now close at 5pm on Saturdays. Please update the footer and Google listing.", status: "RESOLVED", h: 240, replies: [["MawuWebs", "Done. Footer and contact page updated.", 230], [null, "Perfect, thank you!", 228]] },
  { email: "kofi@bluepalm.example", subject: "Invoice question: hosting renewal", body: "Why was hosting billed twice this year?", status: "RESOLVED", h: 400, replies: [["MawuWebs", "One was the domain renewal. We have split them on the invoice for clarity.", 390]] },
  { email: "yaw@accrasolar.example", subject: "New hire needs a mailbox", body: "Please create a mailbox for Esi Quaye (esi@accrasolar.example).", status: "OPEN", h: 2, replies: [] },
];

async function main() {
  if (await prisma.ticket.count({ where: { body: { contains: MARK } } })) { console.log("Sample tickets already exist."); return; }
  let made = 0;
  for (const s of specs) {
    const user = await prisma.user.findUnique({ where: { email: s.email } });
    if (!user) { console.log("Missing user", s.email, "- run seed-sample-work.ts first"); continue; }
    const project = s.project ? await prisma.clientProject.findFirst({ where: { userId: user.id, title: s.project } }) : null;
    const last = s.replies.length ? Math.min(...s.replies.map((r) => r[2])) : s.h;
    await prisma.ticket.create({
      data: {
        userId: user.id, projectId: project?.id ?? null, subject: s.subject, body: `${s.body} ${MARK}`, urgent: s.urgent ?? false, status: s.status,
        createdAt: ago(s.h), updatedAt: ago(last), resolvedAt: s.status === "RESOLVED" ? ago(last) : null,
        replies: { create: s.replies.map(([staffName, body, h, internal]) => ({ staffName, body, internal: internal ?? false, createdAt: ago(h) })) },
      },
    });
    made++;
  }
  console.log(`Created ${made} tickets.`);
}
main().finally(() => prisma.$disconnect());
