import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Fresh database every run: apply the real migrations, then seed one admin and one enquiry.
 * Runs as part of the web server command (before `next start`), not as Playwright globalSetup:
 * Playwright starts the web server first, and recreating the database file under a running server
 * leaves some of its connections pointing at the deleted file.
 */
function prepare() {
  const dir = path.resolve(__dirname, ".tmp");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const env = { ...process.env, DATABASE_URL: `file:${path.join(dir, "e2e.db")}` };
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });
  execFileSync("npx", ["tsx", path.resolve(__dirname, "seed.ts")], { env, stdio: "inherit" });
}

prepare();
