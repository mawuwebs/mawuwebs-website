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
import { providersForCurrency } from "@/lib/payment-config";
import {
  CURRENCIES, PAYMENT_METHODS, isQuoteExpired, formatMoney, milestonesFromText, parseMoney, parseTaxPercent, totals, amountPaid,
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
    const unitAmount = parseMoney(raw.unit);
    if (unitAmount === null) return fail(`Line ${i + 1}: enter a valid price like 1500 or 1500.50.`);
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
  return { clientId: client.id, projectId, title: head.data.title, currency: head.data.currency, taxBp, notes: head.data.notes, date, items };
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
          data: { userId: doc.clientId, projectId: doc.projectId, title: doc.title, currency: doc.currency, taxBp: doc.taxBp, notes: doc.notes, validUntil: doc.date, items: { create: doc.items } },
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
          title: doc.title, currency: doc.currency, taxBp: doc.taxBp, notes: doc.notes, validUntil: doc.date, items: { create: doc.items },
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

export async function createInvoiceFromQuote(quoteId: string): Promise<BillingResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: { orderBy: { position: "asc" } }, invoices: { select: { id: true } } } });
    if (!quote) return fail("Quote not found.");
    if (quote.status !== "ACCEPTED") return fail("Only an accepted quote can be turned into an invoice.");
    if (quote.invoices.length) return { success: true, message: "An invoice already exists for this quote.", id: quote.invoices[0].id };
    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "invoice");
      return tx.invoice.create({
        data: {
          number, token: newToken(), userId: quote.userId, projectId: quote.projectId, quoteId: quote.id, title: quote.title,
          currency: quote.currency, taxBp: quote.taxBp, notes: quote.notes, dueDate: new Date(Date.now() + 14 * 86400_000),
          items: { create: quote.items.map((i) => ({ description: i.description, quantity: i.quantity, unitAmount: i.unitAmount, position: i.position })) },
        },
      });
    });
    await logActivity({ userId: user.id, action: "created", entityType: "Invoice", entityId: invoice.id, message: `${user.name ?? "Staff"} created invoice ${invoice.number} from quote ${quote.number}` });
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
      if (inv.status !== "SENT") return fail(inv.status === "DRAFT" ? "Send the invoice before recording a payment." : `This invoice is ${inv.status.toLowerCase()}.`);
      const total = totals(inv.items, inv.taxBp).total;
      const due = total - amountPaid(inv.payments);
      if (amount > due) return fail(`That is more than the balance due (${formatMoney(due, inv.currency)}).`);
      await tx.payment.create({ data: { invoiceId, amount, method: parsed.data.method, reference: parsed.data.reference, note: parsed.data.note, paidAt: paidAt ?? new Date() } });
      const settled = amount === due;
      if (settled) await tx.invoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: paidAt ?? new Date() } });
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
    const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: { select: { id: true, number: true, status: true, userId: true } } } });
    if (!p) return fail("Payment not found.");
    if (p.externalId) return fail("Gateway payments cannot be deleted here. Refund them in the gateway.");
    await prisma.$transaction([
      prisma.payment.delete({ where: { id: paymentId } }),
      // Removing a payment from a paid invoice reopens it.
      ...(p.invoice.status === "PAID" ? [prisma.invoice.update({ where: { id: p.invoice.id }, data: { status: "SENT" as const, paidAt: null } })] : []),
    ]);
    await logActivity({ userId: user.id, action: "deleted", entityType: "Invoice", entityId: p.invoice.id, message: `${user.name ?? "Staff"} removed a payment from ${p.invoice.number}` });
    revalidateBilling(p.invoice.userId);
    return { success: true, message: "Payment removed.", id: p.invoice.id };
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
