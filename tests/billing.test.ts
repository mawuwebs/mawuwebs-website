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
