import { z } from "zod";
import { CURRENCIES, parseMoney } from "./billing";

/** Pure expense helpers (no server-only imports so tests can load them). Amounts are minor units. */

export const EXPENSE_CATEGORIES = ["hosting", "software", "domains", "contractors", "hardware", "marketing", "travel", "fees", "tax", "other"] as const;
export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  hosting: "Hosting and servers",
  software: "Software and subscriptions",
  domains: "Domains",
  contractors: "Contractors and freelancers",
  hardware: "Hardware and equipment",
  marketing: "Marketing and ads",
  travel: "Travel and transport",
  fees: "Bank and gateway fees",
  tax: "Taxes and licences",
  other: "Other",
};

export const EXPENSE_METHODS = ["momo", "bank", "cash", "card", "other"] as const;

/** Total per category, largest first. */
export function byCategory(rows: { category: string; amount: number }[]) {
  const m = new Map<string, { category: string; amount: number; count: number }>();
  for (const r of rows) {
    const e = m.get(r.category) ?? { category: r.category, amount: 0, count: 0 };
    e.amount += r.amount;
    e.count++;
    m.set(r.category, e);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount);
}

/** Money in minus money out (refunds already netted off collected). Can be negative. */
export const profit = (netCollected: number, expenses: number) => netCollected - expenses;

// ---------------------------------------------------------------------------
// Input parsing (pure, so it is unit tested without a database)
// ---------------------------------------------------------------------------

export type ExpenseInput = {
  description: string;
  vendor: string;
  category: string;
  amount: string;
  /** Input tax already included in the amount. Empty = none. */
  taxAmount: string;
  currency: string;
  method: string;
  reference: string;
  note: string;
  projectId: string;
  billable: boolean;
  /** YYYY-MM-DD */
  spentAt: string;
};

const base = z.object({
  description: z.string().trim().min(2, "Say what it was for.").max(200),
  vendor: z.string().trim().max(120).default(""),
  category: z.enum(EXPENSE_CATEGORIES, { error: "Choose a category." }),
  currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
  method: z.enum(EXPENSE_METHODS, { error: "Choose how it was paid." }),
});

const expenseSchema = base.extend({
  reference: z.string().trim().max(120).default(""),
  note: z.string().trim().max(1000).default(""),
  projectId: z.string().default(""),
  billable: z.boolean().default(false),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date it was paid."),
});

/** JS rolls 2026-02-31 over to March; a real date round-trips to the same text. */
const isRealDate = (text: string, d: Date) => !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;

/** Amount plus the tax portion, both in minor units. */
function money(amountIn: string, taxIn: string): { amount: number; taxAmount: number } | string {
  const amount = parseMoney(amountIn);
  if (amount === null || amount === 0) return "Enter an amount like 250 or 250.50.";
  const taxAmount = taxIn.trim() === "" ? 0 : parseMoney(taxIn);
  if (taxAmount === null) return "Enter the tax as an amount like 15 or 15.50, or leave it empty.";
  if (taxAmount > amount) return "The tax cannot be more than the amount.";
  return { amount, taxAmount };
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; message: string };

/** Validate a staff-entered expense. `now` is injectable for tests. */
export function parseExpenseInput(input: ExpenseInput, now = new Date()): Parsed<{
  description: string; vendor: string; category: string; currency: string; method: string; reference: string; note: string;
  projectId: string | null; billable: boolean; amount: number; taxAmount: number; spentAt: Date;
}> {
  const p = expenseSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
  const m = money(input.amount, input.taxAmount);
  if (typeof m === "string") return { ok: false, message: m };
  const spentAt = new Date(`${p.data.spentAt}T12:00:00Z`);
  if (!isRealDate(p.data.spentAt, spentAt)) return { ok: false, message: "Enter a valid date." };
  if (spentAt.getTime() > now.getTime() + 864e5) return { ok: false, message: "Enter a valid date that is not in the future." };
  if (p.data.billable && !p.data.projectId) return { ok: false, message: "Pick the client project to re-bill this to, or untick \"bill to client\"." };
  return { ok: true, data: { ...p.data, projectId: p.data.projectId || null, ...m, spentAt } };
}

export type RecurringExpenseInput = {
  description: string; vendor: string; category: string; amount: string; taxAmount: string; currency: string; method: string;
  intervalMonths: string; firstRun: string; autoRecord: boolean;
};

export function parseRecurringExpenseInput(input: RecurringExpenseInput): Parsed<{
  description: string; vendor: string; category: string; currency: string; method: string; amount: number; taxAmount: number;
  intervalMonths: number; nextRunAt: Date; autoRecord: boolean;
}> {
  const p = base.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
  const m = money(input.amount, input.taxAmount);
  if (typeof m === "string") return { ok: false, message: m };
  const months = Number(input.intervalMonths);
  if (!Number.isInteger(months) || months < 1 || months > 24) return { ok: false, message: "Choose how often it repeats." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.firstRun)) return { ok: false, message: "Enter the next due date." };
  const nextRunAt = new Date(`${input.firstRun}T00:00:00Z`);
  if (!isRealDate(input.firstRun, nextRunAt)) return { ok: false, message: "Enter a valid due date." };
  return { ok: true, data: { ...p.data, ...m, intervalMonths: months, nextRunAt, autoRecord: input.autoRecord } };
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Identify a receipt from its first bytes so a renamed file cannot pass as an image or PDF. */
export function sniffReceipt(buf: Buffer): keyof typeof RECEIPT_EXT | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

/** Safe display name for a downloaded receipt. */
export const cleanFileName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "receipt";

// ---------------------------------------------------------------------------
// Recurring schedule maths (UTC)
// ---------------------------------------------------------------------------

/** Add whole months in UTC, clamping to the month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsUtc(d: Date, months: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes()));
}

/**
 * Every due date up to `now`, oldest first (at most `cap`, so a long-paused schedule cannot flood the books),
 * and the next date after them. Day-of-month is kept from the original date, not drifted by clamping.
 */
export function duePeriods(nextRunAt: Date, intervalMonths: number, now: Date, cap = 24): { due: Date[]; next: Date } {
  const due: Date[] = [];
  let n = 0;
  let at = nextRunAt;
  while (at <= now && due.length < cap) {
    due.push(at);
    n++;
    at = addMonthsUtc(nextRunAt, n * intervalMonths);
  }
  // Past the cap: jump forward without recording, so tomorrow's run is not stuck in the past.
  while (at <= now) { n++; at = addMonthsUtc(nextRunAt, n * intervalMonths); }
  return { due, next: at };
}
