import { test } from "node:test";
import assert from "node:assert/strict";
import {
  totals, parseMoney, formatDocNumber, parseTaxPercent, balanceDue, isOverdue, parseMilestones, minorToInput,
} from "../src/lib/billing";
import { can } from "../src/lib/permissions";

test("totals: integer maths with tax rounded half up", () => {
  const t = totals([{ description: "a", quantity: 3, unitAmount: 3333 }, { description: "b", quantity: 1, unitAmount: 1 }], 1250);
  assert.equal(t.subtotal, 10000);
  assert.equal(t.tax, 1250);
  assert.equal(t.total, 11250);
  assert.equal(totals([{ description: "x", quantity: 1, unitAmount: 5 }], 1000).tax, 1); // 0.5 -> 1
});

test("parseMoney: accepts valid amounts, rejects junk and negatives", () => {
  assert.equal(parseMoney("1,250.50"), 125050);
  assert.equal(parseMoney("10"), 1000);
  assert.equal(parseMoney("0.5"), 50);
  for (const bad of ["", "-5", "1.234", "abc", "1e3", "12.", ".5"]) assert.equal(parseMoney(bad), null, bad);
  assert.equal(minorToInput(125050), "1250.50");
});

test("parseTaxPercent: blank is zero, bounds enforced", () => {
  assert.equal(parseTaxPercent(""), 0);
  assert.equal(parseTaxPercent("12.5"), 1250);
  assert.equal(parseTaxPercent("15%"), 1500);
  assert.equal(parseTaxPercent("101"), null);
  assert.equal(parseTaxPercent("-1"), null);
});

test("formatDocNumber pads to four digits", () => {
  assert.equal(formatDocNumber("INV", 2026, 7), "INV-2026-0007");
  assert.equal(formatDocNumber("Q", 2026, 12345), "Q-2026-12345");
});

test("balanceDue never goes negative; overdue only when sent, unpaid and past due", () => {
  assert.equal(balanceDue(1000, [{ amount: 400 }, { amount: 300 }]), 300);
  assert.equal(balanceDue(1000, [{ amount: 1500 }]), 0);
  const past = new Date(Date.now() - 86400_000);
  assert.ok(isOverdue({ status: "SENT", dueDate: past }, 100));
  assert.equal(isOverdue({ status: "SENT", dueDate: past }, 0), false);
  assert.equal(isOverdue({ status: "DRAFT", dueDate: past }, 100), false);
  assert.equal(isOverdue({ status: "SENT", dueDate: null }, 100), false);
});

test("parseMilestones survives bad JSON and wrong shapes", () => {
  assert.deepEqual(parseMilestones("nope"), []);
  assert.deepEqual(parseMilestones('{"a":1}'), []);
  assert.deepEqual(parseMilestones('[{"title":"Design","done":true},{"title":" "},5]'), [{ title: "Design", done: true }]);
});

test("permissions: billing is limited to admin and editor", () => {
  assert.ok(can("ADMIN", "billing"));
  assert.ok(can("EDITOR", "billing"));
  assert.equal(can("SUPPORT", "billing"), false);
  assert.equal(can("CONTENT", "billing"), false);
  assert.equal(can("CLIENT", "billing"), false);
});

import { createHmac } from "node:crypto";
import { providersFor, verifyPaystackSignature, verifyStripeSignature } from "../src/lib/payments-verify";

test("paystack signature: valid passes, tampered body or wrong secret fails", () => {
  const body = '{"event":"charge.success"}';
  const sig = createHmac("sha512", "sk_test").update(body).digest("hex");
  assert.ok(verifyPaystackSignature(body, sig, "sk_test"));
  assert.equal(verifyPaystackSignature(body + " ", sig, "sk_test"), false);
  assert.equal(verifyPaystackSignature(body, sig, "other"), false);
  assert.equal(verifyPaystackSignature(body, null, "sk_test"), false);
  assert.equal(verifyPaystackSignature(body, "short", "sk_test"), false);
});

test("stripe signature: valid passes; stale, tampered and malformed fail", () => {
  const body = '{"type":"checkout.session.completed"}';
  const now = 1_800_000_000_000;
  const t = String(now / 1000);
  const v1 = createHmac("sha256", "whsec").update(`${t}.${body}`).digest("hex");
  assert.ok(verifyStripeSignature(body, `t=${t},v1=${v1}`, "whsec", now));
  assert.ok(verifyStripeSignature(body, `t=${t},v1=bad,v1=${v1}`, "whsec", now));
  assert.equal(verifyStripeSignature(body, `t=${t},v1=${v1}`, "whsec", now + 301_000), false);
  assert.equal(verifyStripeSignature(body + "x", `t=${t},v1=${v1}`, "whsec", now), false);
  assert.equal(verifyStripeSignature(body, "garbage", "whsec", now), false);
  assert.equal(verifyStripeSignature(body, null, "whsec", now), false);
});

test("providersFor: needs a key and a supported currency", () => {
  assert.deepEqual(providersFor("GHS", {}), []);
  assert.deepEqual(providersFor("GHS", { PAYSTACK_SECRET_KEY: "k", STRIPE_SECRET_KEY: "k" }), ["paystack"]);
  assert.deepEqual(providersFor("USD", { PAYSTACK_SECRET_KEY: "k", STRIPE_SECRET_KEY: "k" }), ["paystack", "stripe"]);
  assert.deepEqual(providersFor("EUR", { PAYSTACK_SECRET_KEY: "k", STRIPE_SECRET_KEY: "k" }), ["stripe"]);
});

import { decryptSecret, encryptSecret } from "../src/lib/secrets";
import { KEY_PATTERN, keyMode } from "../src/lib/payments-verify";

test("secrets: round-trips, hides the plaintext, fails closed on wrong secret or tampering", () => {
  const enc = encryptSecret("sk_test_abcdef1234567890", "auth-secret-1");
  assert.ok(!enc.includes("sk_test"));
  assert.equal(decryptSecret(enc, "auth-secret-1"), "sk_test_abcdef1234567890");
  assert.equal(decryptSecret(enc, "auth-secret-2"), null);
  assert.equal(decryptSecret(enc.slice(0, -2) + "xx", "auth-secret-1"), null);
  assert.equal(decryptSecret("garbage", "auth-secret-1"), null);
  assert.notEqual(encryptSecret("same", "k"), encryptSecret("same", "k")); // random IV
  assert.throws(() => encryptSecret("x", ""));
});

test("key patterns accept real-looking keys and reject mix-ups", () => {
  assert.ok(KEY_PATTERN.paystack.test("sk_test_abcdef1234567890"));
  assert.equal(KEY_PATTERN.paystack.test("pk_test_abcdef1234567890"), false); // public key pasted by mistake
  assert.ok(KEY_PATTERN.stripe.test("sk_live_abcdef1234567890"));
  assert.ok(KEY_PATTERN.stripe.test("rk_test_abcdef1234567890"));
  assert.equal(KEY_PATTERN.stripe.test("pk_live_abcdef1234567890"), false);
  assert.ok(KEY_PATTERN.stripeWebhook.test("whsec_abcdef1234567890"));
  assert.equal(KEY_PATTERN.stripeWebhook.test("sk_test_abcdef1234567890"), false);
  assert.equal(keyMode("sk_test_x"), "test");
  assert.equal(keyMode("sk_live_x"), "live");
  assert.equal(keyMode(null), null);
});

import { csvCell, depositSplit, parseSignedMoney, reminderStage, subtotal } from "../src/lib/billing";

test("parseSignedMoney: discounts allowed, zero and junk rejected", () => {
  assert.equal(parseSignedMoney("-50"), -5000);
  assert.equal(parseSignedMoney("-12.5"), -1250);
  assert.equal(parseSignedMoney("50"), 5000);
  for (const bad of ["-0", "-", "--5", "5-", "abc", ""]) assert.equal(parseSignedMoney(bad), null, bad);
});

test("a discount line reduces the total and tax applies to the net", () => {
  const t = totals([{ description: "Build", quantity: 1, unitAmount: 100000 }, { description: "Discount", quantity: 1, unitAmount: -20000 }], 1000);
  assert.equal(t.subtotal, 80000);
  assert.equal(t.tax, 8000);
  assert.equal(t.total, 88000);
});

test("depositSplit: parts add up to the subtotal exactly", () => {
  for (const [sub, pct] of [[100000, 50], [99999, 30], [1, 50], [333333, 99]] as const) {
    const s = depositSplit(sub, pct);
    assert.equal(s.deposit + s.balance, sub);
  }
  assert.deepEqual(depositSplit(100000, 40), { deposit: 40000, balance: 60000 });
  assert.equal(subtotal([{ description: "x", quantity: 2, unitAmount: 500 }]), 1000);
});

test("reminderStage: 3 days then 14 days, never when paid, not sent or not late enough", () => {
  const now = new Date("2026-12-31T12:00:00Z");
  const due = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400_000);
  const inv = (status: string, daysAgo: number, reminderCount: number) => ({ status, dueDate: due(daysAgo), reminderCount });
  assert.equal(reminderStage(inv("SENT", 2, 0), 100, now), null);
  assert.equal(reminderStage(inv("SENT", 3, 0), 100, now), 1);
  assert.equal(reminderStage(inv("SENT", 10, 1), 100, now), null);
  assert.equal(reminderStage(inv("SENT", 14, 1), 100, now), 2);
  assert.equal(reminderStage(inv("SENT", 30, 2), 100, now), null);
  assert.equal(reminderStage(inv("SENT", 30, 0), 0, now), null);
  assert.equal(reminderStage(inv("PAID", 30, 0), 100, now), null);
  assert.equal(reminderStage({ status: "SENT", dueDate: null, reminderCount: 0 }, 100, now), null);
});

test("csvCell: quotes, escapes and neutralises formulas; numbers stay numeric", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(csvCell("-cmd"), `"'-cmd"`);
  assert.equal(csvCell(-12.5), "-12.5");
  assert.equal(csvCell(null), '""');
});
