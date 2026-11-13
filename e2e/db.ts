import { E2E_DB } from "../playwright.config";

type Db = { prepare(sql: string): { run(...a: unknown[]): unknown; get(...a: unknown[]): Record<string, unknown> | undefined; all(...a: unknown[]): Record<string, unknown>[] }; close(): void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3") as new (path: string) => Db;

/** Dates in the exact text form Prisma writes, so comparisons in the app's queries behave. */
export const ts = (d: Date = new Date()) => d.toISOString().replace("Z", "+00:00");
export const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

/** Open the throwaway e2e database directly (the generated Prisma client is ESM-only and cannot load in Playwright). */
export function withDb<T>(fn: (db: Db) => T): T {
  const db = new Database(E2E_DB);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
