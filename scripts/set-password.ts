// Usage: npm run admin:password -- you@example.com 'a-long-new-password'
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error("Usage: npm run admin:password -- <email> <password of at least 10 characters>");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10), passwordChangedAt: new Date(), mustChangePassword: false } });
  console.log(`Password updated for ${email}`);
}

main().finally(() => prisma.$disconnect());
