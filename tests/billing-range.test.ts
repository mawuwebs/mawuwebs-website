import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRange, seriesLabel } from "../src/lib/billing-range";

// Wed 2026-11-11 15:30 UTC
const NOW = new Date("2026-11-11T15:30:00Z");

test("today is one day, bucketed by day", () => {
  const r = resolveRange("today", undefined, undefined, NOW);
  assert.equal(r.fromS, "2026-11-11");
  assert.equal(r.toS, "2026-11-11");
  assert.equal(r.days, 1);
  assert.equal(r.bucket, "day");
});

test("week starts Monday and spans 7 days", () => {
  const r = resolveRange("week", undefined, undefined, NOW);
  assert.equal(r.fromS, "2026-11-09");
  assert.equal(r.toS, "2026-11-15");
  assert.equal(r.days, 7);
});

test("week on a Sunday still starts the previous Monday", () => {
  const r = resolveRange("week", undefined, undefined, new Date("2026-11-15T23:59:00Z"));
  assert.equal(r.fromS, "2026-11-09");
});

test("month, quarter and year boundaries", () => {
  assert.deepEqual(
    [resolveRange("month", undefined, undefined, NOW).fromS, resolveRange("month", undefined, undefined, NOW).toS],
    ["2026-11-01", "2026-11-30"],
  );
  const q = resolveRange("quarter", undefined, undefined, NOW);
  assert.equal(q.fromS, "2026-10-01");
  assert.equal(q.toS, "2026-12-31");
  const y = resolveRange("year", undefined, undefined, NOW);
  assert.equal(y.fromS, "2026-01-01");
  assert.equal(y.toS, "2026-12-31");
  assert.equal(y.bucket, "month");
});

test("custom range is inclusive of the end day", () => {
  const r = resolveRange("custom", "2026-10-01", "2026-10-03", NOW);
  assert.equal(r.days, 3);
  assert.equal(r.toS, "2026-10-03");
  assert.equal(+r.to - +r.from, 3 * 864e5);
});

test("bad custom input falls back to this month", () => {
  for (const [f, t] of [["nope", "2026-10-03"], ["2026-10-05", "2026-10-01"], ["2020-01-01", "2026-10-01"], [undefined, undefined]] as const) {
    const r = resolveRange("custom", f, t, NOW);
    assert.equal(r.key, "month");
    assert.equal(r.fromS, "2026-11-01");
  }
});

test("unknown period defaults to month", () => {
  assert.equal(resolveRange("bogus", undefined, undefined, NOW).key, "month");
  assert.equal(resolveRange(undefined, undefined, undefined, NOW).key, "month");
});

test("long ranges bucket by month, short by day", () => {
  assert.equal(resolveRange("custom", "2026-01-01", "2026-03-31", NOW).bucket, "month");
  assert.equal(resolveRange("custom", "2026-01-01", "2026-02-15", NOW).bucket, "day");
});

test("quarter from January and December edges", () => {
  assert.equal(resolveRange("quarter", undefined, undefined, new Date("2026-01-01T00:00:00Z")).fromS, "2026-01-01");
  assert.equal(resolveRange("quarter", undefined, undefined, new Date("2026-12-31T23:00:00Z")).toS, "2026-12-31");
});

test("seriesLabel formats day and month buckets", () => {
  assert.equal(seriesLabel("2026-11-09", "day"), "9 Nov");
  assert.equal(seriesLabel("2026-11", "month"), "Nov 26");
});
