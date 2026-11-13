import { test } from "node:test";
import assert from "node:assert/strict";
import { can, ROLES, ROLE_META } from "../src/lib/permissions";
import { sniffImage } from "../src/lib/image-sniff";
import { generatePassword, passwordStrength } from "../src/lib/password-utils";

test("permissions: admin and editor reach every area", () => {
  for (const area of ["content", "orders", "newsletter", "settings", "activity"] as const) {
    assert.ok(can("ADMIN", area), `admin ${area}`);
    assert.ok(can("EDITOR", area), `editor ${area}`);
  }
});

test("permissions: support sees orders only", () => {
  assert.ok(can("SUPPORT", "orders"));
  for (const area of ["content", "newsletter", "settings", "activity"] as const) {
    assert.equal(can("SUPPORT", area), false, area);
  }
});

test("permissions: content editor sees content only", () => {
  assert.ok(can("CONTENT", "content"));
  for (const area of ["orders", "newsletter", "settings", "activity"] as const) {
    assert.equal(can("CONTENT", area), false, area);
  }
});

test("permissions: missing role has no access, every role has metadata", () => {
  assert.equal(can(undefined, "content"), false);
  for (const r of ROLES) assert.ok(ROLE_META[r].label);
});

test("sniffImage: recognises real images and rejects disguised files", () => {
  const pad = Buffer.alloc(16);
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), pad])), "image/jpeg");
  assert.equal(
    sniffImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad])),
    "image/png"
  );
  assert.equal(sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), pad])), "image/webp");
  assert.equal(sniffImage(Buffer.concat([Buffer.from("GIF89a"), pad])), "image/gif");
  assert.equal(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
  assert.equal(sniffImage(Buffer.from("#!/bin/sh\necho hi\n")), null);
});

test("password-utils: generated passwords are long, distinct and rated strong", () => {
  const a = generatePassword();
  const b = generatePassword();
  assert.equal(a.length, 16);
  assert.notEqual(a, b);
  assert.ok(passwordStrength(a).score >= 3);
});

test("password-utils: short passwords are flagged", () => {
  assert.equal(passwordStrength("abc").label, "Too short");
  assert.equal(passwordStrength("").label, "");
});
