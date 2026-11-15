import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every exported server action is a public HTTP endpoint. Each one must either check who is calling
// (require*/auth/portal guard) or be listed here on purpose, with the reason.
const GUARD = /\b(requireUser|requireAdmin|requireArea|requirePortal\w*|requireClient\w*|auth\(\)|rateLimited|assertCanEdit\w*|guard\w*)\(/;
const PUBLIC_OK: Record<string, string> = {
  "auth.ts": "sign-out only ends the caller's own session",
  "toolkit.ts": "delegates to the rate-limited newsletter signup",
};

const dir = join(process.cwd(), "src/lib/actions");

for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(dir, file), "utf8");
  if (!/^["']use server["']/.test(src.trimStart())) continue;
  const parts = src.split(/^export async function /m).slice(1);
  for (const part of parts) {
    const name = part.slice(0, part.indexOf("("));
    test(`action ${file}:${name} checks the caller`, () => {
      const body = part.split(/^(?=export |\/\/ -{3,})/m)[0];
      assert.ok(GUARD.test(body) || file in PUBLIC_OK, `${file}:${name} has no auth or rate-limit check. Add one or list the file in PUBLIC_OK.`);
    });
  }
}
