"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { requireClientAction } from "@/lib/portal";
import { logActivity } from "@/lib/activity-log";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { rateLimited } from "@/lib/rate-limit";
import { createCheckoutUrl } from "@/lib/gateway";
import { deliverInvoice, nextNumber } from "@/lib/invoicing";
import { getBillingSettings } from "@/lib/billing-settings";
import { providersForCurrency } from "@/lib/payment-config";
import {
  CURRENCIES, PAYMENT_METHODS, isQuoteExpired, formatMoney, milestonesFromText, parseMoney, parseSignedMoney, parseTaxPercent, depositSplit, subtotal, totals, amountPaid,
} from "@/lib/billing";

export type BillingResult = { success: boolean; message: string; id?: string };

const fail = (message: string): BillingResult => ({ success: false, message });

async function guard(fn: () => Promise<BillingResult>): Promise<BillingResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

const newToken = () => randomBytes(24).toString("base64url");

function parseDate(s: string): Date | null | "bad" {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

function revalidateBilling(clientId?: string) {
  revalidatePath("/admin/billing");
  revalidatePath("/portal");
  revalidatePath("/portal/billing");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Shared document input (quote and invoice editors)
// ---------------------------------------------------------------------------

export type DocInput = {
  clientId: string;
  projectId: string;
  title: string;
  currency: string;
  taxPercent: string;
  notes: string;
  /** Quote: valid until. Invoice: due date. YYYY-MM-DD or empty. */
  date: string;
  /** Quotes only: percent invoiced up front (0-99). */
  depositPercent?: string;
  items: { description: string; quantity: string; unit: string }[];
};

const docSchema = z.object({
  clientId: z.string().min(1, "Choose a client."),
  projectId: z.string().default(""),
  title: z.string().trim().min(2, "Give it a title.").max(140),
  currency: z.enum(CURRENCIES),
  notes: z.string().trim().max(4000).default(""),
  date: z.string().default(""),
});

type CleanDoc = {
  clientId: string;
  projectId: string | null;
  title: string;
  currency: string;
  taxBp: number;
  notes: string;
  date: Date | null;
  depositPct: number;
  items: { description: string; quantity: number; unitAmount: number; position: number }[];
};

async function cleanDoc(input: DocInput): Promise<CleanDoc | BillingResult> {
  const head = docSchema.safeParse(input);
  if (!head.success) return fail(head.error.issues[0].message);
  const taxBp = parseTaxPercent(input.taxPercent);
  if (taxBp === null) return fail("Tax must be a percentage between 0 and 100.");
  const date = parseDate(head.data.date);
  if (date === "bad") return fail("Enter a valid date.");
  if (!input.items.length) return fail("Add at least one line item.");
  if (input.items.length > 50) return fail("Too many line items (50 max).");
  const items: CleanDoc["items"] = [];
  for (const [i, raw] of input.items.entries()) {
    const description = raw.description.trim().slice(0, 300);
    if (!description) return fail(`Line ${i + 1} needs a description.`);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) return fail(`Line ${i + 1}: quantity must be a whole number of 1 or more.`);
    const unitAmount = parseSignedMoney(raw.unit);
    if (unitAmount === null) return fail(`Line ${i + 1}: enter a valid price like 1500 or 1500.50 (use a minus sign for a discount).`);
    items.push({ description, quantity, unitAmount, position: i });
  }
  const client = await prisma.user.findFirst({ where: { id: head.data.clientId, role: "CLIENT" }, select: { id: true } });
  if (!client) return fail("Client not found.");
  let projectId: string | null = null;
  if (head.data.projectId) {
    const p = await prisma.clientProject.findFirst({ where: { id: head.data.projectId, userId: client.id }, select: { id: true } });
    if (!p) return fail("That project does not belong to this client.");
    projectId = p.id;
  }
  if (totals(items, taxBp).total < 0) return fail("Discounts cannot make the total negative.");
  const depositRaw = (input.depositPercent ?? "").trim();
  const depositPct = depositRaw === "" ? 0 : Number(depositRaw);
  if (!Number.isInteger(depositPct) || depositPct < 0 || depositPct > 99) return fail("Deposit must be a whole percentage from 0 to 99.");
  return { clientId: client.id, projectId, title: head.data.title, currency: head.data.currency, taxBp, notes: head.data.notes, date, depositPct, items };
}

const isResult = (v: CleanDoc | BillingResult): v is BillingResult => "success" in v;

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function saveQuote(id: string | null, input: DocInput, submissionId?: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const doc = await cleanDoc(input);
    if (isResult(doc)) return doc;

    if (id) {
      const existing = await prisma.quote.findUnique({ where: { id }, select: { status: true, userId: true } });
      if (!existing) return fail("Quote not found.");
      if (existing.status !== "DRAFT") return fail("Only draft quotes can be edited. Sent quotes are locked so the client sees what they were offered.");
      await prisma.$transaction([
        prisma.quoteItem.deleteMany({ where: { quoteId: id } }),
        prisma.quote.update({
          where: { id },
          data: { userId: doc.clientId, projectId: doc.projectId, title: doc.title, currency: doc.currency, taxBp: doc.taxBp, notes: doc.notes, validUntil: doc.date, depositPct: doc.depositPct, items: { create: doc.items } },
        }),
      ]);
      revalidateBilling(doc.clientId);
      return { success: true, message: "Saved.", id };
    }

    let linkedSubmission: string | null = null;
    if (submissionId) {
      const s = await prisma.contactSubmission.findUnique({ where: { id: submissionId }, select: { id: true } });
      linkedSubmission = s?.id ?? null;
    }
    const quote = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "quote");
      return tx.quote.create({
        data: {
          number, token: newToken(), userId: doc.clientId, projectId: doc.projectId, submissionId: linkedSubmission,
          title: doc.title, currency: doc.currency, taxBp: doc.taxBp, notes: doc.notes, validUntil: doc.date, depositPct: doc.depositPct, items: { create: doc.items },
        },
      });
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Quote", entityId: quote.id, message: `${user.name ?? "Staff"} created quote ${quote.number}` });
    revalidateBilling(doc.clientId);
    return { success: true, message: "Quote created.", id: quote.id };
  });
}

export async function sendQuote(id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true, user: { select: { name: true, email: true } } } });
    if (!quote) return fail("Quote not found.");
    if (quote.status === "ACCEPTED" || quote.status === "DECLINED") return fail(`This quote was already ${quote.status.toLowerCase()}.`);
    const t = totals(quote.items, quote.taxBp);
    if (t.total <= 0) return fail("The quote total must be more than zero.");
    const settings = await getSiteSettings();
    const link = `${siteUrl()}/q/${quote.token}`;
    const emailed = await sendMail({
      to: quote.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Quote ${quote.number} from ${settings.siteName}`,
      text: `Hi ${quote.user.name.split(" ")[0]},\n\nHere is your quote for ${quote.title}: ${formatMoney(t.total, quote.currency)}${quote.validUntil ? `, valid until ${quote.validUntil.toLocaleDateString("en-GB")}` : ""}.\n\nView, print or accept it here:\n${link}\n\n${settings.siteName}`,
    });
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
      if (quote.submissionId) {
        await tx.contactSubmission.updateMany({
          where: { id: quote.submissionId, status: { notIn: ["WON", "LOST"] } },
          data: { status: "QUOTED", quoteAmount: Math.round(t.total / 100), statusChangedAt: new Date() },
        });
      }
    });
    await logActivity({ userId: user.id, action: "updated", entityType: "Quote", entityId: id, message: `${user.name ?? "Staff"} sent quote ${quote.number}` });
    revalidateBilling(quote.userId);
    revalidatePath("/admin/messages");
    return { success: true, message: emailed ? "Quote emailed to the client." : `Marked as sent. Email is not configured or failed, so share this link yourself: ${link}`, id };
  });
}

type Decision = "ACCEPTED" | "DECLINED";

async function respondToQuote(where: { id?: string; token?: string; userId?: string }, decision: Decision, by: string): Promise<BillingResult> {
  const quote = await prisma.quote.findFirst({ where, include: { items: true, user: { select: { name: true } } } });
  if (!quote || quote.status === "DRAFT") return fail("Quote not found.");
  if (quote.status !== "SENT") return fail(`This quote was already ${quote.status.toLowerCase()}.`);
  if (decision === "ACCEPTED" && isQuoteExpired(quote.validUntil)) {
    return fail("This quote has expired. Please contact us for an updated one.");
  }
  // Conditional update so two simultaneous clicks cannot both succeed.
  const res = await prisma.quote.updateMany({
    where: { id: quote.id, status: "SENT" },
    data: decision === "ACCEPTED" ? { status: "ACCEPTED", acceptedAt: new Date(), acceptedBy: by } : { status: "DECLINED", declinedAt: new Date() },
  });
  if (!res.count) return fail("This quote was already answered.");
  if (quote.submissionId) {
    await prisma.contactSubmission.updateMany({
      where: { id: quote.submissionId, status: { not: "LOST" } },
      data: { status: decision === "ACCEPTED" ? "WON" : "LOST", statusChangedAt: new Date(), ...(decision === "DECLINED" ? { lostReason: "Declined the quote" } : {}) },
    });
  }
  await logActivity({ userId: null, action: "updated", entityType: "Quote", entityId: quote.id, message: `${by} ${decision === "ACCEPTED" ? "accepted" : "declined"} quote ${quote.number}` });
  const settings = await getSiteSettings();
  await sendMail({
    to: notifyEmail(settings.contactEmail),
    subject: `Quote ${quote.number} ${decision === "ACCEPTED" ? "accepted" : "declined"} by ${quote.user.name}`,
    text: `${by} ${decision === "ACCEPTED" ? "accepted" : "declined"} quote ${quote.number} (${quote.title}, ${formatMoney(totals(quote.items, quote.taxBp).total, quote.currency)}).\n\n${siteUrl()}/admin/billing`,
  });
  revalidateBilling(quote.userId);
  revalidatePath("/admin/messages");
  revalidatePath(`/q/${quote.token}`);
  return { success: true, message: decision === "ACCEPTED" ? "Thank you. The quote is accepted and we will be in touch." : "The quote was declined." };
}

/** Public emailed link. The token is the credential; the typed name is recorded as the acceptor. */
export async function answerQuoteByToken(token: string, decision: Decision, name: string): Promise<BillingResult> {
  return guard(async () => {
    const by = name.trim().slice(0, 100);
    if (decision === "ACCEPTED" && by.length < 2) return fail("Type your full name to accept.");
    if (typeof token !== "string" || token.length < 16) return fail("Quote not found.");
    if (await rateLimited("quote-answer", 10, 60_000)) return fail("Too many attempts. Wait a minute and try again.");
    return respondToQuote({ token }, decision, by || "The client");
  });
}

/** Signed-in portal user answering their own quote. */
export async function answerQuoteInPortal(id: string, decision: Decision): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireClientAction();
    return respondToQuote({ id, userId: user.id }, decision, user.name);
  });
}

export async function createInvoiceFromQuote(quoteId: string, kind: "full" | "deposit" | "balance" = "full"): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: { orderBy: { position: "asc" } }, invoices: { select: { id: true, kind: true, status: true } } } });
    if (!quote) return fail("Quote not found.");
    if (quote.status !== "ACCEPTED") return fail("Only an accepted quote can be turned into an invoice.");
    const live = quote.invoices.filter((i) => i.status !== "VOID");
    const has = (k: string) => live.some((i) => i.kind === k);
    if (kind === "full" && live.length) return { success: true, message: "An invoice already exists for this quote.", id: live[0].id };
    if (kind !== "full" && quote.depositPct === 0) return fail("This quote has no deposit.");
    if (kind === "deposit" && live.length) return fail("This quote has already been invoiced.");
    if (kind === "balance" && !has("deposit")) return fail("Create the deposit invoice first.");
    if (kind === "balance" && has("balance")) return fail("The balance invoice already exists.");

    const sub = subtotal(quote.items);
    const split = depositSplit(sub, quote.depositPct);
    const items =
      kind === "full"
        ? quote.items.map((i) => ({ description: i.description, quantity: i.quantity, unitAmount: i.unitAmount, position: i.position }))
        : kind === "deposit"
          ? [{ description: `Deposit (${quote.depositPct}%): ${quote.title}`, quantity: 1, unitAmount: split.deposit, position: 0 }]
          : [{ description: `Balance (${100 - quote.depositPct}%): ${quote.title}`, quantity: 1, unitAmount: split.balance, position: 0 }];
    if (items.some((i) => i.unitAmount <= 0) && kind !== "full") return fail("The deposit split came out as zero. Adjust the quote.");
    const bs = await getBillingSettings();
    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "invoice");
      return tx.invoice.create({
        data: {
          number, token: newToken(), userId: quote.userId, projectId: quote.projectId, quoteId: quote.id, kind,
          title: kind === "full" ? quote.title : `${quote.title} (${kind})`,
          currency: quote.currency, taxBp: quote.taxBp, notes: kind === "full" ? quote.notes : "",
          // A deposit is due on acceptance; everything else follows the default payment terms.
          dueDate: new Date(Date.now() + (kind === "deposit" ? 3 : bs.defaultDueDays) * 86400_000),
          items: { create: items },
        },
      });
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Invoice", entityId: invoice.id, message: `${user.name ?? "Staff"} created ${kind} invoice ${invoice.number} from quote ${quote.number}` });
    revalidateBilling(quote.userId);
    return { success: true, message: "Invoice created as a draft.", id: invoice.id };
  });
}

// ---------------------------------------------------------------------------
// Invoices and payments
// ---------------------------------------------------------------------------

export async function saveInvoice(id: string | null, input: DocInput): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const doc = await cleanDoc(input);
    if (isResult(doc)) return doc;

    if (id) {
      const existing = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return fail("Invoice not found.");
      if (existing.status !== "DRAFT") return fail("Only draft invoices can be edited. Void it and create a new one if something is wrong.");
      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
        prisma.invoice.update({
          where: { id },
          data: { userId: doc.clientId, projectId: doc.projectId, title: doc.title, currency: doc.currency, taxBp: doc.taxBp, notes: doc.notes, dueDate: doc.date, items: { create: doc.items } },
        }),
      ]);
      revalidateBilling(doc.clientId);
      return { success: true, message: "Saved.", id };
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "invoice");
      return tx.invoice.create({
        data: {
          number, token: newToken(), userId: doc.clientId, projectId: doc.projectId, title: doc.title, currency: doc.currency,
          taxBp: doc.taxBp, notes: doc.notes, dueDate: doc.date, items: { create: doc.items },
        },
      });
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Invoice", entityId: invoice.id, message: `${user.name ?? "Staff"} created invoice ${invoice.number}` });
    revalidateBilling(doc.clientId);
    return { success: true, message: "Invoice created.", id: invoice.id };
  });
}

export async function sendInvoice(id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const r = await deliverInvoice(id);
    if (!r.ok) return fail(r.message);
    await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: id, message: `${user.name ?? "Staff"} sent invoice ${r.number}` });
    revalidateBilling(r.userId);
    return { success: true, message: r.emailed ? "Invoice emailed to the client." : `Marked as sent. Email is not configured or failed, so share this link yourself: ${r.link}`, id };
  });
}

/**
 * Public "I have paid" note from the invoice link (bank transfer, mobile money). It does NOT record a payment:
 * money is only recorded once staff confirm it landed. It emails staff and leaves an activity entry.
 */
export async function notifyPaymentByToken(token: string, input: { method: string; reference: string; note: string }): Promise<BillingResult> {
  return guard(async () => {
    if (typeof token !== "string" || token.length < 16) return fail("Invoice not found.");
    const method = (PAYMENT_METHODS as readonly string[]).includes(input.method) ? input.method : "other";
    const reference = String(input.reference ?? "").trim().slice(0, 120);
    const note = String(input.note ?? "").trim().slice(0, 500);
    if (reference.length < 3) return fail("Enter the transaction or reference number from your payment.");
    if (await rateLimited("invoice-paid-note", 5, 10 * 60_000)) return fail("Too many attempts. Wait a few minutes and try again.");
    const inv = await prisma.invoice.findUnique({ where: { token }, include: { items: true, payments: true, user: { select: { name: true, email: true } } } });
    if (!inv || inv.status !== "SENT") return fail("This invoice is not open for payment.");
    const balance = totals(inv.items, inv.taxBp).total - amountPaid(inv.payments);
    if (balance <= 0) return fail("This invoice has nothing left to pay.");
    const settings = await getSiteSettings();
    await logActivity({ userId: null, action: "updated", entityType: "Invoice", entityId: inv.id, message: `${inv.user.name} says they paid ${inv.number} by ${method} (ref ${reference}). Awaiting confirmation` });
    await sendMail({
      to: notifyEmail(settings.contactEmail),
      replyTo: inv.user.email,
      subject: `Payment claimed: ${inv.number} (${formatMoney(balance, inv.currency)})`,
      text: `${inv.user.name} <${inv.user.email}> says they paid invoice ${inv.number} (balance ${formatMoney(balance, inv.currency)}).\n\nMethod: ${method}\nReference: ${reference}${note ? `\nNote: ${note}` : ""}\n\nCheck your account, then record the payment:\n${siteUrl()}/admin/billing/invoices/${inv.id}`,
    });
    return { success: true, message: "Thank you. We will confirm your payment and update the invoice shortly." };
  });
}

const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).default(""),
  note: z.string().trim().max(500).default(""),
  paidAt: z.string().default(""),
});

export async function recordPayment(
  invoiceId: string,
  input: { amount: string; method: string; reference: string; note: string; paidAt: string }
): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) return fail("Choose a payment method.");
    const amount = parseMoney(input.amount);
    if (amount === null || amount === 0) return fail("Enter a payment amount like 500 or 500.50.");
    const paidAt = parseDate(parsed.data.paidAt);
    if (paidAt === "bad") return fail("Enter a valid payment date.");

    // Read, check and write in one transaction so concurrent payments cannot overpay.
    type Paid = { ok: true; inv: { number: string; currency: string; userId: string; user: { name: string; email: string } }; settled: boolean };
    const outcome: Paid | BillingResult = await prisma.$transaction(async (tx): Promise<Paid | BillingResult> => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true, payments: true, user: { select: { name: true, email: true } } } });
      if (!inv) return fail("Invoice not found.");
      if (inv.status !== "SENT" && inv.status !== "DRAFT") return fail(`This invoice is ${inv.status.toLowerCase()}.`);
      const total = totals(inv.items, inv.taxBp).total;
      if (total <= 0) return fail("The invoice total must be more than zero.");
      const due = total - amountPaid(inv.payments);
      if (amount > due) return fail(`That is more than the balance due (${formatMoney(due, inv.currency)}).`);
      await tx.payment.create({ data: { invoiceId, amount, method: parsed.data.method, reference: parsed.data.reference, note: parsed.data.note, paidAt: paidAt ?? new Date() } });
      const settled = amount === due;
      // Taking a payment on a draft issues it (without an email) so the record is final and the payment has an invoice to belong to.
      if (settled) await tx.invoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: paidAt ?? new Date(), ...(inv.status === "DRAFT" ? { sentAt: new Date() } : {}) } });
      else if (inv.status === "DRAFT") await tx.invoice.update({ where: { id: invoiceId }, data: { status: "SENT", sentAt: new Date() } });
      return { ok: true, inv, settled };
    });
    if (!("ok" in outcome)) return outcome;
    const { inv, settled } = outcome;
    await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: invoiceId, message: `${user.name ?? "Staff"} recorded ${formatMoney(amount, inv.currency)} on ${inv.number}${settled ? " (paid in full)" : ""}` });
    const settings = await getSiteSettings();
    await sendMail({
      to: inv.user.email,
      replyTo: notifyEmail(settings.contactEmail),
      subject: `Payment received for invoice ${inv.number}`,
      text: `Hi ${inv.user.name.split(" ")[0]},\n\nThank you. We received ${formatMoney(amount, inv.currency)} for invoice ${inv.number}${settled ? ", which is now paid in full" : ""}.\n\n${settings.siteName}`,
    });
    revalidateBilling(inv.userId);
    return { success: true, message: settled ? "Payment recorded. Invoice is fully paid." : "Part payment recorded.", id: invoiceId };
  });
}

export async function deletePayment(paymentId: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const p = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, externalId: true, invoiceId: true } });
    if (!p) return fail("Payment not found.");
    if (p.externalId) return fail("Gateway payments and refunds are kept as a record. To correct one, record a refund or a payment that offsets it.");
    const inv = await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      const i = await tx.invoice.findUniqueOrThrow({ where: { id: p.invoiceId }, include: { items: true, payments: true } });
      // Status follows the money: removing a payment reopens a paid invoice, removing a refund can close it again.
      const covered = amountPaid(i.payments) >= totals(i.items, i.taxBp).total;
      if (i.status === "PAID" && !covered) await tx.invoice.update({ where: { id: i.id }, data: { status: "SENT", paidAt: null } });
      if (i.status === "SENT" && covered) await tx.invoice.update({ where: { id: i.id }, data: { status: "PAID", paidAt: new Date() } });
      return i;
    });
    await logActivity({ userId: user.id, action: "deleted", entityType: "Invoice", entityId: inv.id, message: `${user.name ?? "Staff"} removed a payment entry from ${inv.number}` });
    revalidateBilling(inv.userId);
    return { success: true, message: "Entry removed.", id: inv.id };
  });
}

export async function voidInvoice(id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const inv = await prisma.invoice.findUnique({ where: { id }, include: { payments: { select: { id: true } } } });
    if (!inv) return fail("Invoice not found.");
    if (inv.payments.length) return fail("Remove the recorded payments first, or leave the invoice as it is.");
    if (inv.status === "VOID") return fail("Already void.");
    await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });
    await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: id, message: `${user.name ?? "Staff"} voided invoice ${inv.number}` });
    revalidateBilling(inv.userId);
    return { success: true, message: "Invoice voided.", id };
  });
}

/** Drafts only. Anything that was ever sent stays on record (void it instead). */
export async function deleteDraft(kind: "quote" | "invoice", id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    if (kind === "quote") {
      const q = await prisma.quote.findUnique({ where: { id }, select: { status: true, number: true, userId: true } });
      if (!q) return fail("Quote not found.");
      if (q.status !== "DRAFT") return fail("Only drafts can be deleted.");
      await prisma.quote.delete({ where: { id } });
      await logActivity({ userId: user.id, action: "deleted", entityType: "Quote", entityId: id, message: `${user.name ?? "Staff"} deleted draft quote ${q.number}` });
      revalidateBilling(q.userId);
    } else {
      const i = await prisma.invoice.findUnique({ where: { id }, select: { status: true, number: true, userId: true } });
      if (!i) return fail("Invoice not found.");
      if (i.status !== "DRAFT") return fail("Only drafts can be deleted. Void a sent invoice instead.");
      await prisma.invoice.delete({ where: { id } });
      await logActivity({ userId: user.id, action: "deleted", entityType: "Invoice", entityId: id, message: `${user.name ?? "Staff"} deleted draft invoice ${i.number}` });
      revalidateBilling(i.userId);
    }
    return { success: true, message: "Draft deleted." };
  });
}

// ---------------------------------------------------------------------------
// Client projects
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  title: z.string().trim().min(2, "Give the project a title.").max(140),
  summary: z.string().trim().max(2000).default(""),
  status: z.enum(["PLANNING", "IN_PROGRESS", "REVIEW", "ON_HOLD", "DONE"]),
  startDate: z.string().default(""),
  dueDate: z.string().default(""),
  milestones: z.string().max(6000).default(""),
});

export async function saveClientProject(id: string | null, clientId: string, input: z.input<typeof projectSchema>): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("orders");
    const client = await prisma.user.findFirst({ where: { id: clientId, role: "CLIENT" }, select: { id: true } });
    if (!client) return fail("Client not found.");
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const startDate = parseDate(parsed.data.startDate);
    const dueDate = parseDate(parsed.data.dueDate);
    if (startDate === "bad" || dueDate === "bad") return fail("Enter valid dates.");
    const data = {
      title: parsed.data.title, summary: parsed.data.summary, status: parsed.data.status, startDate, dueDate,
      milestones: JSON.stringify(milestonesFromText(parsed.data.milestones)),
    };
    let projectId = id;
    if (id) {
      const res = await prisma.clientProject.updateMany({ where: { id, userId: clientId }, data });
      if (!res.count) return fail("Project not found.");
    } else {
      projectId = (await prisma.clientProject.create({ data: { ...data, userId: clientId } })).id;
      await logActivity({ userId: user.id, action: "created", entityType: "ClientProject", entityId: projectId, message: `${user.name ?? "Staff"} added project ${data.title}` });
    }
    revalidateBilling(clientId);
    revalidatePath("/portal/projects");
    return { success: true, message: "Saved.", id: projectId ?? undefined };
  });
}

export async function deleteClientProject(id: string, clientId: string): Promise<BillingResult> {
  return guard(async () => {
    await requireArea("orders");
    await prisma.clientProject.deleteMany({ where: { id, userId: clientId } });
    revalidateBilling(clientId);
    revalidatePath("/portal/projects");
    return { success: true, message: "Project removed." };
  });
}

// ---------------------------------------------------------------------------
// Online payment
// ---------------------------------------------------------------------------

/** Public (the invoice token is the credential). Returns the gateway page to send the payer to. */
export async function startCheckout(token: string, provider: "paystack" | "stripe"): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    if (typeof token !== "string" || token.length < 16 || (provider !== "paystack" && provider !== "stripe")) return fail("Invoice not found.");
    if (await rateLimited("checkout", 10, 60_000)) return fail("Too many attempts. Wait a minute and try again.");
    const inv = await prisma.invoice.findUnique({ where: { token }, select: { currency: true } });
    if (!inv) return fail("Invoice not found.");
    if (!(await providersForCurrency(inv.currency)).includes(provider)) return fail("That payment method is not available for this invoice.");
    const r = await createCheckoutUrl(token, provider);
    return "url" in r ? { success: true, message: "Redirecting…", url: r.url } : fail(r.error);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

// ---------------------------------------------------------------------------
// Recurring invoices (managed plans)
// ---------------------------------------------------------------------------

const recurringSchema = z.object({
  title: z.string().trim().min(2, "Give it a title.").max(140),
  description: z.string().trim().min(2, "Describe what is billed.").max(300),
  currency: z.enum(CURRENCIES),
  intervalMonths: z.coerce.number().int().refine((n) => [1, 2, 3, 6, 12].includes(n), "Choose how often to bill."),
  dueDays: z.coerce.number().int().min(0).max(120),
  notes: z.string().trim().max(4000).default(""),
  firstRun: z.string().min(1, "Choose the first billing date."),
});

export async function saveRecurring(
  clientId: string,
  input: { title: string; description: string; amount: string; currency: string; taxPercent: string; intervalMonths: string; dueDays: string; notes: string; firstRun: string; autoSend: boolean }
): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const client = await prisma.user.findFirst({ where: { id: clientId, role: "CLIENT" }, select: { id: true } });
    if (!client) return fail("Client not found.");
    const parsed = recurringSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const unitAmount = parseMoney(input.amount);
    if (unitAmount === null || unitAmount === 0) return fail("Enter an amount like 450 or 450.50.");
    const taxBp = parseTaxPercent(input.taxPercent);
    if (taxBp === null) return fail("Tax must be a percentage between 0 and 100.");
    const first = parseDate(parsed.data.firstRun);
    if (!first || first === "bad") return fail("Enter a valid first billing date.");
    const { firstRun: _firstRun, ...rest } = parsed.data;
    void _firstRun;
    const row = await prisma.recurringInvoice.create({ data: { ...rest, unitAmount, taxBp, nextRunAt: first, autoSend: input.autoSend, userId: clientId } });
    await logActivity({ userId: user.id, action: "created", entityType: "RecurringInvoice", entityId: row.id, message: `${user.name ?? "Staff"} set up recurring billing "${row.title}"` });
    revalidateBilling(clientId);
    return { success: true, message: "Recurring billing set up.", id: row.id };
  });
}

export async function setRecurringActive(id: string, clientId: string, active: boolean): Promise<BillingResult> {
  return guard(async () => {
    await requireArea("billing");
    const res = await prisma.recurringInvoice.updateMany({ where: { id, userId: clientId }, data: { active } });
    if (!res.count) return fail("Not found.");
    revalidateBilling(clientId);
    return { success: true, message: active ? "Resumed." : "Paused." };
  });
}

export async function deleteRecurring(id: string, clientId: string): Promise<BillingResult> {
  return guard(async () => {
    await requireArea("billing");
    await prisma.recurringInvoice.deleteMany({ where: { id, userId: clientId } });
    revalidateBilling(clientId);
    return { success: true, message: "Removed. Invoices already created are untouched." };
  });
}

// ---------------------------------------------------------------------------
// Refunds and billing settings
// ---------------------------------------------------------------------------

/**
 * Record money handed back to the client (bank transfer, MoMo, or a gateway refund you issued in its dashboard).
 * Stored as a negative payment so the balance and the Paid status recompute from one source.
 */
export async function recordRefund(invoiceId: string, input: { amount: string; note: string }): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const amount = parseMoney(input.amount);
    if (amount === null || amount === 0) return fail("Enter the refund amount like 200 or 200.50.");
    const note = input.note.trim().slice(0, 500);
    const res = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true, payments: true } });
      if (!inv) return fail("Invoice not found.");
      if (inv.status !== "SENT" && inv.status !== "PAID") return fail("Only a sent or paid invoice can be refunded.");
      const paid = amountPaid(inv.payments);
      if (amount > paid) return fail(`You can refund at most ${formatMoney(paid, inv.currency)}, the amount received so far.`);
      await tx.payment.create({ data: { invoiceId, amount: -amount, method: "refund", note, reference: "" } });
      const stillPaid = paid - amount >= totals(inv.items, inv.taxBp).total;
      if (inv.status === "PAID" && !stillPaid) await tx.invoice.update({ where: { id: invoiceId }, data: { status: "SENT", paidAt: null } });
      return { success: true, message: "Refund recorded.", id: invoiceId, _cur: inv.currency, _num: inv.number, _uid: inv.userId };
    });
    if (!res.success) return res;
    const { _cur, _num, _uid } = res as BillingResult & { _cur: string; _num: string; _uid: string };
    await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: invoiceId, message: `${user.name ?? "Staff"} recorded a ${formatMoney(amount, _cur)} refund on ${_num}` });
    revalidateBilling(_uid);
    return { success: true, message: "Refund recorded.", id: invoiceId };
  });
}

const settingsSchema = z.object({
  legalName: z.string().trim().max(160).default(""),
  taxId: z.string().trim().max(60).default(""),
  paymentInstructions: z.string().trim().max(2000).default(""),
  quoteTerms: z.string().trim().max(4000).default(""),
  defaultCurrency: z.enum(CURRENCIES),
  defaultDueDays: z.coerce.number().int().min(0).max(120),
  remindersEnabled: z.boolean(),
});

export async function saveBillingSettings(input: z.input<typeof settingsSchema> & { defaultTaxPercent: string }): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const defaultTaxBp = parseTaxPercent(input.defaultTaxPercent);
    if (defaultTaxBp === null) return fail("Tax must be a percentage between 0 and 100.");
    const data = { ...parsed.data, defaultTaxBp };
    await prisma.billingSettings.upsert({ where: { id: "main" }, create: { id: "main", ...data }, update: data });
    await logActivity({ userId: user.id, action: "updated", entityType: "BillingSettings", entityId: "main", message: `${user.name ?? "Staff"} updated billing settings` });
    revalidatePath("/admin/billing", "layout");
    return { success: true, message: "Saved." };
  });
}

// ---------------------------------------------------------------------------
// Link control and duplication
// ---------------------------------------------------------------------------

/** Kills the old emailed link and issues a new one. Use it if a link was forwarded or leaked. Drafts have no link yet. */
export async function regenerateLink(kind: "quote" | "invoice", id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const token = newToken();
    if (kind === "quote") {
      const q = await prisma.quote.findUnique({ where: { id }, select: { number: true, status: true, userId: true } });
      if (!q) return fail("Quote not found.");
      if (q.status === "DRAFT") return fail("Drafts have no client link yet.");
      await prisma.quote.update({ where: { id }, data: { token } });
      await logActivity({ userId: user.id, action: "updated", entityType: "Quote", entityId: id, message: `${user.name ?? "Staff"} replaced the client link for ${q.number}` });
      revalidateBilling(q.userId);
    } else {
      const i = await prisma.invoice.findUnique({ where: { id }, select: { number: true, status: true, userId: true } });
      if (!i) return fail("Invoice not found.");
      if (i.status === "DRAFT") return fail("Drafts have no client link yet.");
      await prisma.invoice.update({ where: { id }, data: { token } });
      await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: id, message: `${user.name ?? "Staff"} replaced the client link for ${i.number}` });
      revalidateBilling(i.userId);
    }
    return { success: true, message: "New link created. The old link no longer works. Use Resend email to send the new one.", id };
  });
}

/** Copies a quote or invoice into a fresh draft with the same lines. The way to "revise" something already sent. */
export async function duplicateDocument(kind: "quote" | "invoice", id: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    if (kind === "quote") {
      const q = await prisma.quote.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } } } });
      if (!q) return fail("Quote not found.");
      const copy = await prisma.$transaction(async (tx) =>
        tx.quote.create({
          data: {
            number: await nextNumber(tx, "quote"), token: newToken(), userId: q.userId, projectId: q.projectId, submissionId: q.submissionId,
            title: q.title, currency: q.currency, taxBp: q.taxBp, notes: q.notes, depositPct: q.depositPct,
            items: { create: q.items.map((i) => ({ description: i.description, quantity: i.quantity, unitAmount: i.unitAmount, position: i.position })) },
          },
        })
      );
      await logActivity({ userId: user.id, action: "created", entityType: "Quote", entityId: copy.id, message: `${user.name ?? "Staff"} duplicated quote ${q.number} as ${copy.number}` });
      revalidateBilling(q.userId);
      return { success: true, message: `Copied as draft ${copy.number}.`, id: copy.id };
    }
    const i = await prisma.invoice.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } } } });
    if (!i) return fail("Invoice not found.");
    const bs = await getBillingSettings();
    const copy = await prisma.$transaction(async (tx) =>
      tx.invoice.create({
        data: {
          number: await nextNumber(tx, "invoice"), token: newToken(), userId: i.userId, projectId: i.projectId,
          title: i.title, currency: i.currency, taxBp: i.taxBp, notes: i.notes, dueDate: new Date(Date.now() + bs.defaultDueDays * 86400_000),
          items: { create: i.items.map((x) => ({ description: x.description, quantity: x.quantity, unitAmount: x.unitAmount, position: x.position })) },
        },
      })
    );
    await logActivity({ userId: user.id, action: "created", entityType: "Invoice", entityId: copy.id, message: `${user.name ?? "Staff"} duplicated invoice ${i.number} as ${copy.number}` });
    revalidateBilling(i.userId);
    return { success: true, message: `Copied as draft ${copy.number}.`, id: copy.id };
  });
}
