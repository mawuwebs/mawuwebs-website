import { test } from "node:test";
import assert from "node:assert/strict";
import { renewalLevel, quoteNeedsNudge, monitorTarget, isUpStatus, formatDuration } from "../src/lib/automation";

const now = new Date("2026-06-15T09:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

test("renewalLevel: none, 30d, 7d, expired", () => {
  assert.equal(renewalLevel(null, now), 0);
  assert.equal(renewalLevel(days(60), now), 0);
  assert.equal(renewalLevel(days(30), now), 1);
  assert.equal(renewalLevel(days(8), now), 1);
  assert.equal(renewalLevel(days(7), now), 2);
  assert.equal(renewalLevel(days(1), now), 2);
  assert.equal(renewalLevel(days(0), now), 3);
  assert.equal(renewalLevel(days(-3), now), 3);
});

test("quoteNeedsNudge: only old, unanswered, un-nudged, still valid quotes", () => {
  const base = { status: "SENT", sentAt: days(-6), nudgedAt: null, validUntil: null };
  assert.ok(quoteNeedsNudge(base, now));
  assert.ok(!quoteNeedsNudge({ ...base, sentAt: days(-4) }, now));
  assert.ok(!quoteNeedsNudge({ ...base, nudgedAt: days(-1) }, now));
  assert.ok(!quoteNeedsNudge({ ...base, status: "ACCEPTED" }, now));
  assert.ok(!quoteNeedsNudge({ ...base, sentAt: null }, now));
  assert.ok(!quoteNeedsNudge({ ...base, validUntil: days(-1) }, now));
  assert.ok(quoteNeedsNudge({ ...base, validUntil: days(3) }, now));
});

test("monitorTarget: blank allowed, http(s) only, no credentials", () => {
  assert.equal(monitorTarget(""), "");
  assert.equal(monitorTarget("example.com"), "https://example.com/");
  assert.equal(monitorTarget("http://example.com/a"), "http://example.com/a");
  assert.equal(monitorTarget("ftp://example.com"), null);
  assert.equal(monitorTarget("javascript:alert(1)"), null);
  assert.equal(monitorTarget("https://user:pw@example.com"), null);
  assert.equal(monitorTarget("localhost"), null);
});

test("isUpStatus and formatDuration", () => {
  assert.ok(isUpStatus(200) && isUpStatus(301) && isUpStatus(403));
  assert.ok(!isUpStatus(500) && !isUpStatus(503) && !isUpStatus(0));
  assert.equal(formatDuration(30_000), "1 min");
  assert.equal(formatDuration(90 * 60_000), "1 h 30 min");
  assert.equal(formatDuration(72 * 3_600_000), "3 days");
});
