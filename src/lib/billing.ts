/**
 * Pure billing maths and formatting. No server-only imports, so the editor (client)
 * and the server actions share one implementation.
 *
 * Money is always an integer in minor units (pesewas, cents). Tax rates are basis
 * points (1250 = 12.5%). Never use floats for stored amounts.
 */

export const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const isCurrency = (c: string): c is Currency => (CURRENCIES as readonly string[]).includes(c);

export const PAYMENT_METHODS = ["momo", "bank", "cash", "card", "paystack", "stripe", "other"] as const;
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  momo: "Mobile money",
  bank: "Bank transfer",
  cash: "Cash",
  card: "Card",
  paystack: "Paystack",
  stripe: "Stripe",
  other: "Other",
  refund: "Refund",
};

export type LineItem = { description: string; quantity: number; unitAmount: number };

export const lineTotal = (i: LineItem) => i.quantity * i.unitAmount;
export const subtotal = (items: LineItem[]) => items.reduce((n, i) => n + lineTotal(i), 0);
/** Tax rounds half up to the nearest minor unit. */
export const taxAmount = (sub: number, taxBp: number) => Math.round((sub * taxBp) / 10_000);
export const totals = (items: LineItem[], taxBp: number) => {
  const sub = subtotal(items);
  const tax = taxAmount(sub, taxBp);
  return { subtotal: sub, tax, total: sub + tax };
};

export const amountPaid = (payments: { amount: number }[]) => payments.reduce((n, p) => n + p.amount, 0);
export const balanceDue = (total: number, payments: { amount: number }[]) => Math.max(0, total - amountPaid(payments));

/** Format minor units, e.g. 150050 + "GHS" -> "GH₵1,500.50". */
export function formatMoney(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

/** "1,250.50" or "1250.5" -> 125050. Returns null when it is not a valid non-negative amount. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= 100_000_000_00 ? minor : null;
}

/** Minor units -> editable string, "125050" -> "1250.50". */
export const minorToInput = (minor: number) => (minor / 100).toFixed(2);

/** Percent string like "12.5" -> 1250 basis points, or null when invalid or outside 0-100%. */
export function parseTaxPercent(input: string): number | null {
  const cleaned = input.trim().replace(/%$/, "");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const bp = Math.round(Number(cleaned) * 100);
  return bp >= 0 && bp <= 10_000 ? bp : null;
}
export const bpToPercent = (bp: number) => String(bp / 100);

/** Next document number, e.g. ("INV", 2026, 7) -> "INV-2026-0007". */
export const formatDocNumber = (prefix: string, year: number, n: number) => `${prefix}-${year}-${String(n).padStart(4, "0")}`;

export const QUOTE_STATUS_LABEL = { DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", DECLINED: "Declined" } as const;
export const INVOICE_STATUS_LABEL = { DRAFT: "Draft", SENT: "Sent", PAID: "Paid", VOID: "Void" } as const;
export const PROJECT_STATUS_LABEL = {
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  REVIEW: "In review",
  ON_HOLD: "On hold",
  DONE: "Done",
} as const;

export type InvoiceStatusValue = keyof typeof INVOICE_STATUS_LABEL;

/** A sent invoice with money still owed past its due date. Overdue is derived, never stored. */
export function isOverdue(inv: { status: string; dueDate: Date | null }, balance: number, now = new Date()) {
  return inv.status === "SENT" && balance > 0 && !!inv.dueDate && inv.dueDate.getTime() < now.getTime();
}

export type Milestone = { title: string; done: boolean };

/** Milestones are stored as JSON; never trust the shape. */
export function parseMilestones(raw: string): Milestone[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((m): m is { title: unknown; done?: unknown } => !!m && typeof m === "object" && "title" in m)
      .map((m) => ({ title: String(m.title).slice(0, 140), done: m.done === true }))
      .filter((m) => m.title.trim());
  } catch {
    return [];
  }
}

/** Admin edits milestones as text, one per line; a leading "[x]" marks it done. */
export function milestonesFromText(text: string): Milestone[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => {
      const done = /^\[x\]\s*/i.test(l);
      return { title: l.replace(/^\[[ x]?\]\s*/i, "").slice(0, 140), done };
    })
    .filter((m) => m.title);
}
export const milestonesToText = (ms: Milestone[]) => ms.map((m) => `${m.done ? "[x]" : "[ ]"} ${m.title}`).join("\n");

/** A sent quote is valid through the end of its "valid until" day. */
export const isQuoteExpired = (validUntil: Date | null, now = new Date()) =>
  !!validUntil && validUntil.getTime() + 86400_000 < now.getTime();

/** Like parseMoney but allows one leading minus, for discount lines. Zero and out-of-range values are rejected. */
export function parseSignedMoney(input: string): number | null {
  const t = input.trim();
  if (t.startsWith("-")) {
    const m = parseMoney(t.slice(1));
    return m === null || m === 0 ? null : -m;
  }
  return parseMoney(t);
}

/**
 * Split a quote into deposit and balance by percentage of the pre-tax subtotal. Tax is applied to each
 * invoice at the quote's rate, so the two invoices add up to the quote total (give or take one minor unit
 * of rounding per invoice).
 */
export function depositSplit(subtotalMinor: number, pct: number) {
  const deposit = Math.round((subtotalMinor * pct) / 100);
  return { deposit, balance: subtotalMinor - deposit };
}

/** 1 = first reminder (3+ days late), 2 = final reminder (14+ days late), null = nothing due now. */
export function reminderStage(
  inv: { status: string; dueDate: Date | null; reminderCount: number },
  balance: number,
  now = new Date()
): 1 | 2 | null {
  if (inv.status !== "SENT" || balance <= 0 || !inv.dueDate) return null;
  const daysLate = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000);
  if (inv.reminderCount === 0 && daysLate >= 3) return 1;
  if (inv.reminderCount === 1 && daysLate >= 14) return 2;
  return null;
}

/**
 * How an open invoice should show on the dashboard, and which reminder the next cron run sends for it.
 * `soon` mirrors the cron's "due soon" window (due within 3 days, not yet sent); `late` uses reminderStage.
 */
export function invoiceFlags(
  inv: { status: string; dueDate: Date | null; reminderCount: number; preDueReminderAt: Date | null },
  balance: number,
  now = new Date()
) {
  const overdue = isOverdue(inv, balance, now);
  const inWeek = !overdue && inv.status === "SENT" && balance > 0 && !!inv.dueDate && inv.dueDate.getTime() < now.getTime() + 7 * 86400_000;
  const soon = inWeek && !inv.preDueReminderAt && inv.dueDate!.getTime() < now.getTime() + 3 * 86400_000;
  return { overdue, dueSoon: inWeek, soonReminder: soon, lateReminder: reminderStage(inv, balance, now) !== null };
}

/** CSV cell: quoted, with spreadsheet formula injection neutralised. Numbers pass through unquoted. */
export function csvCell(value: string | number | null | undefined) {
  if (typeof value === "number") return String(value);
  let v = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}
