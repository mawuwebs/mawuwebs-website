import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreEstimate, IT_TYPE } from "../src/lib/estimate";
import { parseSubmission, submissionKind } from "../src/lib/submission";
import { withToc } from "../src/lib/toc";
import { readingMinutes } from "../src/lib/reading-time";
import { renderEmphasis } from "../src/lib/emphasis";

test("estimate: small website lands in the smallest tier", () => {
  const { tier } = scoreEstimate({ type: "website", size: "s", features: [] });
  assert.equal(tier.name, "Focused build");
});

test("estimate: store with payments and accounts is a bigger tier", () => {
  const { tier } = scoreEstimate({ type: "store", size: "l", features: ["payments", "accounts"] });
  assert.equal(tier.name, "Custom build");
});

test("estimate: IT services get the assessment tier, not a build time", () => {
  const { tier } = scoreEstimate({ type: IT_TYPE, features: [] });
  assert.equal(tier.name, "Needs a quick assessment");
});

test("submission: structured brief is split into fields and body", () => {
  const p = parseSubmission("Project type: Online store\nTimeline: Flexible\n\nAbout the project:\nA shop.");
  assert.equal(p.structured, true);
  assert.deepEqual(p.fields.map((f) => f.key), ["Project type", "Timeline"]);
  assert.equal(p.body, "A shop.");
});

test("submission: plain messages are not treated as structured", () => {
  assert.equal(parseSubmission("Hello, can you call me?").structured, false);
});

test("submission: kinds come from the subject", () => {
  assert.equal(submissionKind("Project brief"), "brief");
  assert.equal(submissionKind("Support request"), "support");
  assert.equal(submissionKind("Hi there"), "message");
});

test("toc: headings get unique ids and are listed", () => {
  const { html, items } = withToc("<h2>Intro</h2><p>x</p><h2>Intro</h2><h3>Deep dive</h3>");
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map((i) => i.id)).size, 3);
  assert.match(html, /id="intro"/);
});

test("reading time is at least one minute", () => {
  assert.equal(readingMinutes("<p>short</p>"), 1);
  assert.equal(readingMinutes(`<p>${"word ".repeat(660)}</p>`), 3);
});

test("emphasis markers are stripped", () => {
  assert.equal(renderEmphasis("Websites that *earn their keep*."), "Websites that earn their keep.");
});
