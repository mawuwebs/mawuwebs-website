// Money-path tests against a throwaway SQLite database (never the dev DB).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "mawuwebs-test-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
delete process.env.SMTP_HOST; // no real email from tests
delete process.env.SMTP_USER;

type Db = typeof import("../src/lib/prisma")["prisma"];
let prisma: Db;
let applyGatewayPayment: typeof import("../src/lib/gateway")["applyGatewayPayment"];
let applyGatewayRefund: typeof import("../src/lib/gateway")["applyGatewayRefund"];
let seq = 0;

before(async () => {
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env: process.env, stdio: "pipe" });
  ({ prisma } = await import("../src/lib/prisma"));
  ({ applyGatewayPayment, applyGatewayRefund } = await import("../src/lib/gateway"));
});
after(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

/** A SENT invoice of GHS 1,000.00 (100000 minor) with no tax. */
async function makeInvoice(status: "SENT" | "PAID" | "VOID" = "SENT") {
  const n = ++seq;
  const user = await prisma.user.create({ data: { name: `Client ${n}`, email: `c${n}@example.com`, passwordHash: "!", role: "CLIENT" } });
  return prisma.invoice.create({
    data: {
      number: `T-${n}`, userId: user.id, title: "Test", currency: "GHS", taxBp: 0, status, token: `tok-${n}-${"x".repeat(20)}`,
      items: { create: [{ description: "Work", quantity: 1, unitAmount: 100000 }] },
    },
  });
}
const pay = (invoiceId: string, amount: number, ref: string, currency = "GHS") =>
  applyGatewayPayment({ invoiceId, amount, currency, provider: "paystack", externalId: `paystack:${ref}`, reference: ref });

test("full payment marks the invoice PAID", async () => {
  const inv = await makeInvoice();
  assert.equal(await pay(inv.id, 100000, "r1"), "recorded");
  const after = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(after.status, "PAID");
  assert.ok(after.paidAt);
});

test("part payment keeps the invoice SENT, second payment settles it", async () => {
  const inv = await makeInvoice();
  await pay(inv.id, 40000, "p1");
  assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status, "SENT");
  await pay(inv.id, 60000, "p2");
  assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status, "PAID");
});

test("replayed webhook is a duplicate and records nothing twice", async () => {
  const inv = await makeInvoice();
  assert.equal(await pay(inv.id, 100000, "dup"), "recorded");
  assert.equal(await pay(inv.id, 100000, "dup"), "duplicate");
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id } }), 1);
});

test("concurrent deliveries of the same event record once", async () => {
  const inv = await makeInvoice();
  const results = await Promise.all([pay(inv.id, 100000, "race"), pay(inv.id, 100000, "race"), pay(inv.id, 100000, "race")]);
  assert.equal(results.filter((r) => r === "recorded").length, 1);
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id } }), 1);
});

test("currency mismatch, unknown invoice and bad amounts are ignored", async () => {
  const inv = await makeInvoice();
  assert.equal(await pay(inv.id, 100000, "cur", "USD"), "ignored");
  assert.equal(await pay("nope", 100000, "unk"), "ignored");
  assert.equal(await pay(inv.id, 0, "zero"), "ignored");
  assert.equal(await pay(inv.id, -5, "neg"), "ignored");
  assert.equal(await pay(inv.id, 1.5, "frac"), "ignored");
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id } }), 0);
});

test("money for an already-paid invoice is still recorded (it is real money)", async () => {
  const inv = await makeInvoice("PAID");
  assert.equal(await pay(inv.id, 100000, "late"), "recorded");
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id } }), 1);
});

test("refund reopens a paid invoice that is no longer covered, and is idempotent", async () => {
  const inv = await makeInvoice();
  await pay(inv.id, 100000, "paid-1");
  const refund = () =>
    applyGatewayRefund({ provider: "paystack", original: { externalId: "paystack:paid-1" }, amount: 30000, currency: "GHS", externalId: "refund:paystack:rf1", reference: "rf1" });
  assert.equal(await refund(), "recorded");
  assert.equal(await refund(), "duplicate");
  const after = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { payments: true } });
  assert.equal(after.status, "SENT");
  assert.equal(after.paidAt, null);
  assert.equal(after.payments.reduce((n, p) => n + p.amount, 0), 70000);
});

test("refund of an unknown payment is ignored", async () => {
  const r = await applyGatewayRefund({ provider: "paystack", original: { externalId: "paystack:missing" }, amount: 100, currency: "GHS", externalId: "refund:paystack:x", reference: "x" });
  assert.equal(r, "ignored");
});
