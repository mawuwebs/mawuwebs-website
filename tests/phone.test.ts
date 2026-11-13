import { test } from "node:test";
import assert from "node:assert/strict";
import { intlDigits, telHref, whatsappHref, isValidPhone, normalizeWebsite } from "../src/lib/phone";

test("intlDigits: Ghana local, international and junk", () => {
  assert.equal(intlDigits("024 123 4567"), "233241234567");
  assert.equal(intlDigits("0241234567"), "233241234567");
  assert.equal(intlDigits("241234567"), "233241234567");
  assert.equal(intlDigits("+233 24 123 4567"), "233241234567");
  assert.equal(intlDigits("00233241234567"), "233241234567");
  assert.equal(intlDigits("+44 20 7946 0958"), "442079460958");
  assert.equal(intlDigits(""), null);
  assert.equal(intlDigits("abc"), null);
  assert.equal(intlDigits("123"), null);
});

test("tel and WhatsApp links", () => {
  assert.equal(telHref("0241234567"), "tel:+233241234567");
  assert.equal(whatsappHref("+233241234567"), "https://wa.me/233241234567");
  assert.equal(whatsappHref("nope"), null);
});

test("isValidPhone accepts blank and plausible numbers only", () => {
  assert.ok(isValidPhone(""));
  assert.ok(isValidPhone("+233 (0)24-123-4567".replace("(0)", "")));
  assert.ok(!isValidPhone("call me"));
  assert.ok(!isValidPhone("12"));
});

test("normalizeWebsite adds https and rejects non-web input", () => {
  assert.equal(normalizeWebsite("example.com"), "https://example.com");
  assert.equal(normalizeWebsite("https://example.com/"), "https://example.com");
  assert.equal(normalizeWebsite(""), "");
  assert.equal(normalizeWebsite("javascript:alert(1)"), null);
  assert.equal(normalizeWebsite("localhost"), null);
});
