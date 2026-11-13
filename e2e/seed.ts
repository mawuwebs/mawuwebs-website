import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export const ADMIN = { email: "admin@e2e.test", password: "TestPass123!" };

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });

async function main() {
  await prisma.user.create({ data: { name: "E2E Admin", email: ADMIN.email, passwordHash: await bcrypt.hash(ADMIN.password, 10), role: "ADMIN" } });
  await prisma.contactSubmission.create({ data: { name: "Kofi Lead", email: "kofi@lead.test", subject: "Website for my shop", message: "Need a site", kind: "message" } });
}

main().finally(() => prisma.$disconnect());
