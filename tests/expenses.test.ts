import { test } from "node:test";
import assert from "node:assert/strict";
import {
  byCategory, profit, EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORIES, parseExpenseInput, parseRecurringExpenseInput, sniffReceipt, duePeriods, addMonthsUtc, cleanFileName,
  type ExpenseInput,
} from "../src/lib/expenses";

const NOW = new Date("2026-11-13T10:00:00Z");
const good: ExpenseInput = { description: "Hostinger plan", vendor: "Hostinger", category: "hosting", amount: "1,250.50", taxAmount: "", currency: "GHS", method: "card", reference: "", note: "", projectId: "", billable: false, spentAt: "2026-11-10" };
const ok = (over: Partial<ExpenseInput>) => parseExpenseInput({ ...good, ...over }, NOW);

test("byCategory groups and sorts largest first", () => {
  const r = byCategory([{ category: "hosting", amount: 100 }, { category: "software", amount: 500 }, { category: "hosting", amount: 150 }]);
  assert.deepEqual(r, [{ category: "software", amount: 500, count: 1 }, { category: "hosting", amount: 250, count: 2 }]);
});

test("profit can go negative", () => {
  assert.equal(profit(1000, 400), 600);
  assert.equal(profit(100, 400), -300);
});

test("every category has a label", () => {
  for (const c of EXPENSE_CATEGORIES) assert.ok(EXPENSE_CATEGORY_LABEL[c]);
});

test("parseExpenseInput accepts a good expense and converts money to minor units", () => {
  const r = ok({ taxAmount: "100" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.data.amount, 125050);
    assert.equal(r.data.taxAmount, 10000);
    assert.equal(r.data.projectId, null);
    assert.equal(r.data.spentAt.toISOString(), "2026-11-10T12:00:00.000Z");
  }
});

test("parseExpenseInput rejects bad amounts, tax, dates and categories", () => {
  assert.equal(ok({ amount: "0" }).ok, false);
  assert.equal(ok({ amount: "abc" }).ok, false);
  assert.equal(ok({ amount: "-5" }).ok, false);
  assert.equal(ok({ amount: "100", taxAmount: "150" }).ok, false, "tax above amount");
  assert.equal(ok({ taxAmount: "x" }).ok, false);
  assert.equal(ok({ spentAt: "2026-12-25" }).ok, false, "future date");
  assert.equal(ok({ spentAt: "13/11/2026" }).ok, false);
  assert.equal(ok({ spentAt: "2026-02-31" }).ok, false, "impossible date");
  assert.equal(ok({ category: "gold" }).ok, false);
  assert.equal(ok({ currency: "XXX" }).ok, false);
  assert.equal(ok({ description: " " }).ok, false);
});

test("billable needs a project", () => {
  const r = ok({ billable: true });
  assert.equal(r.ok, false);
  assert.equal(ok({ billable: true, projectId: "p1" }).ok, true);
});

test("parseRecurringExpenseInput validates interval and first date", () => {
  const rec = { description: "Domain", vendor: "Namecheap", category: "domains", amount: "60", taxAmount: "", currency: "USD", method: "card", intervalMonths: "12", firstRun: "2027-01-15", autoRecord: true };
  const r = parseRecurringExpenseInput(rec);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.data.nextRunAt.toISOString(), "2027-01-15T00:00:00.000Z");
  assert.equal(parseRecurringExpenseInput({ ...rec, intervalMonths: "0" }).ok, false);
  assert.equal(parseRecurringExpenseInput({ ...rec, intervalMonths: "1.5" }).ok, false);
  assert.equal(parseRecurringExpenseInput({ ...rec, firstRun: "" }).ok, false);
  assert.equal(parseRecurringExpenseInput({ ...rec, firstRun: "2027-02-31" }).ok, false);
});

test("sniffReceipt identifies real files and rejects impostors", () => {
  assert.equal(sniffReceipt(Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(20)])), "application/pdf");
  assert.equal(sniffReceipt(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)])), "image/jpeg");
  assert.equal(sniffReceipt(Buffer.from("<html><script>alert(1)</script></html>")), null);
  assert.equal(sniffReceipt(Buffer.from("%PDF")), null, "too short");
});

test("cleanFileName strips path and odd characters", () => {
  assert.ok(!/[\/"\\]/.test(cleanFileName('../../etc/pass"wd.pdf')));
  assert.ok(!cleanFileName('a"b/c\\d').includes('"'));
  assert.equal(cleanFileName(""), "receipt");
});

test("addMonthsUtc clamps to month end", () => {
  assert.equal(addMonthsUtc(new Date("2027-01-31T00:00:00Z"), 1).toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(addMonthsUtc(new Date("2026-11-15T00:00:00Z"), 3).toISOString(), "2027-02-15T00:00:00.000Z");
});

test("duePeriods returns every missed period and keeps the original day", () => {
  const r = duePeriods(new Date("2026-08-31T00:00:00Z"), 1, NOW);
  assert.deepEqual(r.due.map((d) => d.toISOString().slice(0, 10)), ["2026-08-31", "2026-09-30", "2026-10-31"]);
  assert.equal(r.next.toISOString().slice(0, 10), "2026-11-30");
});

test("duePeriods: nothing due, and cap prevents flooding", () => {
  const future = duePeriods(new Date("2027-01-01T00:00:00Z"), 1, NOW);
  assert.equal(future.due.length, 0);
  const old = duePeriods(new Date("2020-01-01T00:00:00Z"), 1, NOW, 24);
  assert.equal(old.due.length, 24);
  assert.ok(old.next > NOW);
});
