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

test("enquiries: stored kind wins, legacy rows fall back to subject", async () => {
  const { kindOf } = await import("../src/lib/submission");
  assert.equal(kindOf({ kind: "support", subject: "anything" }), "support");
  assert.equal(kindOf({ kind: "message", subject: "Project brief" }), "brief");
  assert.equal(kindOf({ kind: "message", subject: "Hello" }), "message");
});

test("enquiries: filter builder ignores unknown values and caps search", async () => {
  const { buildEnquiryWhere } = await import("../src/lib/submission-query");
  assert.deepEqual(buildEnquiryWhere({ status: "NOPE", type: "nope" }), {});
  const w = buildEnquiryWhere({ status: "WON", type: "plan", q: "x".repeat(500) }) as { AND: unknown[] };
  assert.equal(w.AND.length, 3);
  assert.ok(JSON.stringify(w).length < 1200);
});

test("enquiries: follow-up filter only matches open leads", async () => {
  const { buildEnquiryWhere } = await import("../src/lib/submission-query");
  const w = JSON.stringify(buildEnquiryWhere({ follow: "due" }));
  assert.ok(w.includes("followUpAt"));
  assert.ok(!w.includes("WON") && !w.includes("LOST"));
});

test("enquiries: money formats without cents", async () => {
  const { formatMoney } = await import("../src/lib/submission");
  assert.equal(formatMoney(2500), "$2,500");
});

test("totp: matches the RFC 6238 SHA-1 vectors", async () => {
  const { hotp, base32Encode } = await import("../src/lib/totp");
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  // RFC 6238 appendix B (8-digit values, last 6 digits shown): T=59s -> step 1, T=1111111109 -> step 37037036
  assert.equal(hotp(secret, 1), "287082");
  assert.equal(hotp(secret, 37037036), "081804");
});

test("totp: rejects replay and bad input, accepts +-1 step", async () => {
  const { hotp, verifyTotp, currentStep, generateSecret } = await import("../src/lib/totp");
  const secret = generateSecret();
  const now = Date.now();
  const step = currentStep(now);
  assert.equal(verifyTotp(secret, hotp(secret, step), null, now), step);
  assert.equal(verifyTotp(secret, hotp(secret, step - 1), null, now), step - 1);
  assert.equal(verifyTotp(secret, hotp(secret, step), step, now), null); // replay
  assert.equal(verifyTotp(secret, "12345", null, now), null);
  assert.equal(verifyTotp(secret, "abcdef", null, now), null);
});

test("totp: recovery codes are single use", async () => {
  const { generateRecoveryCodes, consumeRecoveryCode } = await import("../src/lib/totp");
  const { codes, hashes } = generateRecoveryCodes(3);
  const rest = consumeRecoveryCode(JSON.stringify(hashes), codes[1].toUpperCase());
  assert.ok(rest && rest.length === 2);
  assert.equal(consumeRecoveryCode(JSON.stringify(rest), codes[1]), null);
});

test("estimate config: schema accepts the defaults and rejects broken tiers", async () => {
  const { estimateSchema } = await import("../src/lib/form-config-schema");
  const { DEFAULT_ESTIMATE } = await import("../src/lib/estimate");
  assert.ok(estimateSchema.safeParse(DEFAULT_ESTIMATE).success);
  const badLast = { ...DEFAULT_ESTIMATE, tiers: DEFAULT_ESTIMATE.tiers.map((t) => ({ ...t, max: 5 })) };
  assert.equal(estimateSchema.safeParse(badLast).success, false);
  const dupIds = { ...DEFAULT_ESTIMATE, sizes: [DEFAULT_ESTIMATE.sizes[0], DEFAULT_ESTIMATE.sizes[0]] };
  assert.equal(estimateSchema.safeParse(dupIds).success, false);
});

test("estimate config: scoring follows an edited config", async () => {
  const { scoreEstimate, DEFAULT_ESTIMATE } = await import("../src/lib/estimate");
  const cfg = {
    ...DEFAULT_ESTIMATE,
    types: [{ id: "x", label: "X", points: 10 }, ...DEFAULT_ESTIMATE.types],
    tiers: [
      { max: 5, name: "Small", weeks: "1", summary: "" },
      { max: null, name: "Big", weeks: "9", summary: "" },
    ],
  };
  assert.equal(scoreEstimate({ type: "x", features: [] }, cfg).tier.name, "Big");
  assert.equal(scoreEstimate({ type: "website", size: "s", features: [] }, cfg).tier.name, "Small");
});

test("support config: schema needs 2+ issues and 2+ urgency levels", async () => {
  const { supportSchema } = await import("../src/lib/form-config-schema");
  const { DEFAULT_SUPPORT } = await import("../src/lib/support");
  assert.ok(supportSchema.safeParse(DEFAULT_SUPPORT).success);
  assert.equal(supportSchema.safeParse({ ...DEFAULT_SUPPORT, issues: ["only one"] }).success, false);
});

test("plans: features parse from the admin textarea and the stored JSON", async () => {
  const { featuresFromText, toPlan } = await import("../src/lib/plans");
  assert.deepEqual(featuresFromText("  A \n\nB\n  "), ["A", "B"]);
  const p = toPlan({ slug: "s", name: "N", tagline: "", forWho: "", features: '["x","y"]', highlight: true, price: "" });
  assert.deepEqual(p.features, ["x", "y"]);
  assert.equal(p.price, undefined);
  assert.deepEqual(toPlan({ slug: "s", name: "N", tagline: "", forWho: "", features: "not json", highlight: false, price: null }).features, []);
});
