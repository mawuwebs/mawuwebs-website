/**
 * Consistent online backup of the SQLite database (safe while the site is running).
 *   npm run db:backup
 * Env: DATABASE_URL (file:./dev.db), BACKUP_DIR (default ./backups), BACKUP_KEEP (default 14).
 * BACKUP_COPY_CMD (optional): shell command run after a good backup to ship it off the box; the file path is in $BACKUP_FILE,
 *   e.g. BACKUP_COPY_CMD='rclone copyto "$BACKUP_FILE" remote:mawuwebs-backups/$(basename "$BACKUP_FILE")'. A failing command fails the job.
 * Schedule daily, then copy BACKUP_DIR off the server (a backup on the same disk is not a backup).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3") as new (path: string, opts?: { readonly?: boolean; fileMustExist?: boolean }) => {
  backup(dest: string): Promise<unknown>;
  pragma(src: string, opts?: { simple?: boolean }): unknown;
  close(): void;
};

const url = process.env.DATABASE_URL ?? "file:./dev.db";
if (!url.startsWith("file:")) throw new Error(`Only SQLite file: URLs are supported, got ${url.split(":")[0]}:`);
const source = resolve(url.slice("file:".length));
const dir = resolve(process.env.BACKUP_DIR ?? "backups");
const keep = Math.max(1, Number(process.env.BACKUP_KEEP ?? 14));

async function main() {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(dir, `db-${stamp}.sqlite`);

  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }

  // Prove the copy opens and is intact before trusting it, and before deleting older ones.
  const copy = new Database(dest, { readonly: true });
  const check = copy.pragma("integrity_check", { simple: true });
  copy.close();
  if (check !== "ok") {
    rmSync(dest);
    throw new Error(`Backup failed integrity check: ${String(check)}`);
  }

  const copyCmd = process.env.BACKUP_COPY_CMD?.trim();
  if (copyCmd) {
    execSync(copyCmd, { stdio: "inherit", env: { ...process.env, BACKUP_FILE: dest } });
    console.log("Off-box copy command finished.");
  } else {
    console.warn("BACKUP_COPY_CMD is not set: this backup only exists on the same disk as the database.");
  }

  const old = readdirSync(dir)
    .filter((f) => /^db-.*\.sqlite$/.test(f))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(keep);
  for (const o of old) rmSync(join(dir, o.f));
  console.log(`Backed up to ${dest} (${(statSync(dest).size / 1024).toFixed(0)} KB, integrity ok). Kept ${keep}, removed ${old.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
