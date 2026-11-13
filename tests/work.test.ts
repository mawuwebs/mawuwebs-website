import { test } from "node:test";
import assert from "node:assert/strict";
import { taskIsOverdue, progressOf, formatMinutes, parseDuration, timeAmount, timeInvoiceLines, projectHealth } from "../src/lib/work";

const now = new Date("2026-06-15T09:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);

test("taskIsOverdue: done and undated never; due today not yet", () => {
  assert.ok(!taskIsOverdue({ status: "DONE", dueDate: day(-5) }, now));
  assert.ok(!taskIsOverdue({ status: "TODO", dueDate: null }, now));
  assert.ok(!taskIsOverdue({ status: "TODO", dueDate: new Date("2026-06-15T00:00:00Z") }, now));
  assert.ok(taskIsOverdue({ status: "DOING", dueDate: new Date("2026-06-14T00:00:00Z") }, now));
  assert.ok(!taskIsOverdue({ status: "TODO", dueDate: day(2) }, now));
});

test("progressOf", () => {
  assert.deepEqual(progressOf([]), { total: 0, done: 0, pct: 0 });
  assert.deepEqual(progressOf([{ status: "DONE" }, { status: "TODO" }, { status: "DONE" }]), { total: 3, done: 2, pct: 67 });
});

test("formatMinutes and parseDuration", () => {
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(120), "2h");
  assert.equal(formatMinutes(210), "3h 30m");
  assert.equal(parseDuration("1.5"), 90);
  assert.equal(parseDuration("1,5"), 90);
  assert.equal(parseDuration("1:30"), 90);
  assert.equal(parseDuration("90m"), 90);
  assert.equal(parseDuration("1h 30m"), 90);
  assert.equal(parseDuration("2h"), 120);
  assert.equal(parseDuration("0"), null);
  assert.equal(parseDuration("25"), null);
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration("-1"), null);
});

test("timeAmount rounds half up in minor units", () => {
  assert.equal(timeAmount(60, 5000), 5000);
  assert.equal(timeAmount(90, 5000), 7500);
  assert.equal(timeAmount(1, 5000), 83);
  assert.equal(timeAmount(0, 5000), 0);
});

test("timeInvoiceLines groups by task and rate, skips billed, free and non-billable", () => {
  const e = (id: string, minutes: number, extra: Partial<Parameters<typeof timeInvoiceLines>[0][number]> = {}) =>
    ({ id, minutes, rateMinor: 5000, billable: true, invoiceId: null, note: "", taskId: null, task: null, ...extra });
  const r = timeInvoiceLines([
    e("a", 60, { taskId: "t1", task: { title: "Design" } }),
    e("b", 30, { taskId: "t1", task: { title: "Design" } }),
    e("c", 60),
    e("d", 60, { invoiceId: "inv" }),
    e("f", 60, { billable: false }),
    e("g", 60, { rateMinor: 0 }),
    e("h", 60, { taskId: "t1", task: { title: "Design" }, rateMinor: 6000 }),
  ]);
  assert.equal(r.lines.length, 3);
  assert.deepEqual(r.entryIds.sort(), ["a", "b", "c", "h"]);
  assert.equal(r.minutes, 210);
  assert.equal(r.amount, 7500 + 5000 + 6000);
  assert.match(r.lines[0].description, /^Design \(1h 30m\)$/);
});

test("projectHealth", () => {
  const base = { status: "IN_PROGRESS", dueDate: null, lastActivity: day(-1), overdueTasks: 0 };
  assert.equal(projectHealth(base, now), "ok");
  assert.equal(projectHealth({ ...base, overdueTasks: 1 }, now), "late");
  assert.equal(projectHealth({ ...base, dueDate: day(-3) }, now), "late");
  assert.equal(projectHealth({ ...base, lastActivity: day(-20) }, now), "idle");
  assert.equal(projectHealth({ ...base, status: "DONE", overdueTasks: 3 }, now), "ok");
  assert.equal(projectHealth({ ...base, status: "ON_HOLD", lastActivity: day(-40) }, now), "ok");
});

import { budgetState, milestoneState, parseTemplate, templateCounts, STARTER_TEMPLATES, weekStart, timesheetGrid, buildIcs, profitability } from "../src/lib/work";

test("budgetState thresholds", () => {
  assert.equal(budgetState(100, 0).state, "none");
  assert.equal(budgetState(79, 100).state, "ok");
  assert.equal(budgetState(80, 100).state, "warn");
  assert.equal(budgetState(100, 100).state, "over");
  assert.equal(budgetState(150, 100).pct, 150);
});

test("projectHealth flags a nearly used budget but late wins", () => {
  const base = { status: "IN_PROGRESS", dueDate: null, lastActivity: day(-1), overdueTasks: 0, loggedMinutes: 90, budgetMinutes: 100 };
  assert.equal(projectHealth(base, now), "budget");
  assert.equal(projectHealth({ ...base, overdueTasks: 1 }, now), "late");
});

test("milestoneState with and without approval", () => {
  const d = new Date();
  assert.equal(milestoneState({ completedAt: null, requiresApproval: false, approvedAt: null }), "upcoming");
  assert.equal(milestoneState({ completedAt: d, requiresApproval: false, approvedAt: null }), "done");
  assert.equal(milestoneState({ completedAt: d, requiresApproval: true, approvedAt: null }), "awaiting-approval");
  assert.equal(milestoneState({ completedAt: d, requiresApproval: true, approvedAt: d }), "approved");
  assert.equal(milestoneState({ completedAt: null, requiresApproval: true, approvedAt: null }), "upcoming");
});

test("parseTemplate reads milestones, tasks and flags", () => {
  const t = parseTemplate("- Loose task +1d\n# Design +21d !approve $1500.50\n- Wireframes +12d @client !high\n- Notes !low\n\n# Build\n- Code");
  assert.equal(t.loose.length, 1);
  assert.equal(t.loose[0].offsetDays, 1);
  assert.equal(t.milestones.length, 2);
  const m = t.milestones[0];
  assert.deepEqual([m.title, m.offsetDays, m.requiresApproval, m.billMajor], ["Design", 21, true, 1500.5]);
  assert.deepEqual([m.tasks[0].title, m.tasks[0].clientVisible, m.tasks[0].priority, m.tasks[0].offsetDays], ["Wireframes", true, 2, 12]);
  assert.equal(m.tasks[1].priority, 0);
  assert.deepEqual(t.milestones[1].tasks.map((x) => x.title), ["Code"]);
  assert.deepEqual(templateCounts(t), { milestones: 2, tasks: 4 });
});

test("starter templates parse into something usable", () => {
  for (const s of STARTER_TEMPLATES) {
    const c = templateCounts(parseTemplate(s.body));
    assert.ok(c.milestones >= 3 && c.tasks >= 6, s.name);
  }
});

test("weekStart is Monday and timesheetGrid buckets by day", () => {
  assert.equal(weekStart(new Date("2026-06-17T15:00:00Z")).toISOString(), "2026-06-15T00:00:00.000Z");
  assert.equal(weekStart(new Date("2026-06-21T23:00:00Z")).toISOString(), "2026-06-15T00:00:00.000Z");
  const start = new Date("2026-06-15T00:00:00Z");
  const g = timesheetGrid([
    { userId: "a", userName: "Ann", workedOn: new Date("2026-06-15T12:00:00Z"), minutes: 60 },
    { userId: "a", userName: "Ann", workedOn: new Date("2026-06-17T12:00:00Z"), minutes: 30 },
    { userId: "b", userName: "Bo", workedOn: new Date("2026-06-17T12:00:00Z"), minutes: 120 },
    { userId: "b", userName: "Bo", workedOn: new Date("2026-06-22T12:00:00Z"), minutes: 999 },
  ], start);
  assert.equal(g.total, 210);
  assert.equal(g.rows[0].name, "Bo");
  assert.deepEqual(g.dayTotals, [60, 0, 150, 0, 0, 0, 0]);
});

test("buildIcs escapes, uses all-day dates and folds long lines", () => {
  const ics = buildIcs("Work, tasks", [{ uid: "t1", summary: "Fix; this, now", date: new Date("2026-06-15T12:00:00Z"), description: "line1\nline2 " + "x".repeat(120) }], new Date("2026-06-01T08:30:00Z"));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("X-WR-CALNAME:Work" + String.fromCharCode(92) + ", tasks\r\n"));
  assert.match(ics, /DTSTART;VALUE=DATE:20260615\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20260616\r\n/);
  assert.ok(ics.includes("SUMMARY:Fix" + String.fromCharCode(92) + "; this" + String.fromCharCode(92) + ", now\r\n"));
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(ics.includes("DESCRIPTION:line1" + String.fromCharCode(92) + "nline2 "));
});

test("profitability", () => {
  const r = profitability({ invoiced: 100000, collected: 60000, expenses: 20000, loggedMinutes: 600, fixedPrice: 150000 });
  assert.equal(r.margin, 80000);
  assert.equal(r.marginPct, 80);
  assert.equal(r.perHour, 10000);
  assert.equal(r.outstanding, 40000);
  assert.equal(r.toInvoice, 50000);
  const z = profitability({ invoiced: 0, collected: 0, expenses: 5000, loggedMinutes: 0, fixedPrice: 0 });
  assert.equal(z.marginPct, null);
  assert.equal(z.perHour, null);
  assert.equal(z.toInvoice, null);
});

import { progressToken, verifyProgressToken } from "../src/lib/unsubscribe";

test("progress unsubscribe tokens are per user and tamper-proof", () => {
  const t = progressToken("user1", "secret-a");
  assert.ok(verifyProgressToken("user1", t, "secret-a"));
  assert.ok(!verifyProgressToken("user2", t, "secret-a"));
  assert.ok(!verifyProgressToken("user1", t, "secret-b"));
  assert.ok(!verifyProgressToken("user1", t + "x", "secret-a"));
  assert.ok(!verifyProgressToken("user1", "", "secret-a"));
  assert.ok(!verifyProgressToken("", t, "secret-a"));
});
