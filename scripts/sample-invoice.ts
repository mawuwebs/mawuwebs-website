// Usage: npx tsx scripts/sample-invoice.ts
// Creates (or refreshes) a SENT sample invoice with a part payment and prints its public link.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "sample.client@example.com" },
    update: {},
    create: { name: "Ama Mensah", email: "sample.client@example.com", passwordHash: "!", role: "CLIENT" as never, company: "Sample Trading Ltd" } as never,
  });
  const token = "sample-invoice-token-0001";
  await prisma.invoice.deleteMany({ where: { token } });
  const inv = await prisma.invoice.create({
    data: {
      number: "SAMPLE-0001", userId: user.id, title: "Business website and email setup", currency: "GHS", taxBp: 1500,
      notes: "Thank you for choosing us. Late payments may delay hosting renewal.", status: "SENT", token,
      issueDate: new Date(), dueDate: new Date(Date.now() + 14 * 864e5), sentAt: new Date(),
      items: { create: [
        { description: "Website design and build (5 pages)", quantity: 1, unitAmount: 450000 },
        { description: "Business email setup (per mailbox)", quantity: 3, unitAmount: 25000 },
        { description: "Annual hosting and domain", quantity: 1, unitAmount: 90000 },
      ] },
      payments: { create: [{ amount: 300000, method: "momo", reference: "MTN-88213", paidAt: new Date() }] },
    },
  });
  console.log("http://localhost:3000/i/" + token, inv.id);
}
main().finally(() => prisma.$disconnect());
