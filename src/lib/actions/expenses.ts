"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { formatMoney } from "@/lib/billing";
import {
  RECEIPT_EXT, RECEIPT_MAX_BYTES, cleanFileName, parseExpenseInput, parseRecurringExpenseInput, sniffReceipt,
  type ExpenseInput, type RecurringExpenseInput,
} from "@/lib/expenses";
import { RECEIPT_DIR, receiptPath } from "@/lib/receipts";

export type ExpenseResult = { success: boolean; message: string; id?: string };

const fail = (message: string): ExpenseResult => ({ success: false, message });

async function guard(fn: () => Promise<ExpenseResult>): Promise<ExpenseResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}

function refresh() {
  revalidatePath("/admin/billing/expenses");
  revalidatePath("/admin/billing/reports");
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
}

async function removeFile(file: string) {
  const p = receiptPath(file);
  if (p) await unlink(p).catch(() => {});
}

/** Create an expense, or update it when `id` is given. */
export async function saveExpense(input: ExpenseInput, id?: string): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const parsed = parseExpenseInput(input);
    if (!parsed.ok) return fail(parsed.message);
    const data = parsed.data;
    if (data.projectId && !(await prisma.clientProject.findUnique({ where: { id: data.projectId }, select: { id: true } }))) return fail("That project no longer exists.");

    let savedId = id;
    if (id) {
      const current = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { invoiceId: true, amount: true, currency: true, projectId: true } });
      if (!current) return fail("Expense not found.");
      // Once billed, the invoice line has copied the amount, so the money fields and project must not drift from it.
      if (current.invoiceId && (current.amount !== data.amount || current.currency !== data.currency || current.projectId !== data.projectId)) {
        return fail("This expense is already on an invoice, so its amount, currency and project are locked.");
      }
      await prisma.expense.update({ where: { id }, data: current.invoiceId ? { ...data, billable: true } : data });
    } else {
      savedId = (await prisma.expense.create({ data })).id;
    }
    await logActivity({ userId: user.id, action: id ? "updated" : "created", entityType: "Expense", entityId: savedId as string, message: `${user.name ?? "Staff"} ${id ? "updated" : "recorded"} expense ${formatMoney(data.amount, data.currency)}: ${data.description}` });
    refresh();
    return { success: true, message: "Expense saved.", id: savedId };
  });
}

/** Soft delete: the row is hidden everywhere and can be restored. A billed expense cannot be deleted. */
export async function deleteExpense(id: string): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const e = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!e) return fail("Expense not found.");
    if (e.invoiceId) return fail("This expense is on an invoice. Void or delete that invoice first.");
    await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    await logActivity({ userId: user.id, action: "deleted", entityType: "Expense", entityId: id, message: `${user.name ?? "Staff"} deleted expense ${formatMoney(e.amount, e.currency)}: ${e.description}` });
    refresh();
    return { success: true, message: "Expense deleted. You can restore it from Deleted." };
  });
}

export async function restoreExpense(id: string): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const done = await prisma.expense.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null } });
    if (!done.count) return fail("Expense not found.");
    await logActivity({ userId: user.id, action: "restored", entityType: "Expense", entityId: id, message: `${user.name ?? "Staff"} restored an expense` });
    refresh();
    return { success: true, message: "Expense restored." };
  });
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

/** Attach (or replace) a receipt. FormData field "file": JPG, PNG, WEBP or PDF up to 5 MB. */
export async function attachReceipt(id: string, formData: FormData): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a receipt file.");
    if (file.size > RECEIPT_MAX_BYTES) return fail("That file is over 5 MB.");
    const e = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { receiptFile: true } });
    if (!e) return fail("Expense not found.");
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffReceipt(buf);
    if (!mime) return fail("Receipts must be a JPG, PNG, WEBP or PDF file.");
    const stored = `${randomUUID()}.${RECEIPT_EXT[mime]}`;
    await mkdir(RECEIPT_DIR, { recursive: true });
    await writeFile(`${RECEIPT_DIR}/${stored}`, buf, { mode: 0o600 });
    await prisma.expense.update({ where: { id }, data: { receiptFile: stored, receiptName: cleanFileName(file.name), receiptMime: mime } });
    if (e.receiptFile) await removeFile(e.receiptFile);
    await logActivity({ userId: user.id, action: "updated", entityType: "Expense", entityId: id, message: `${user.name ?? "Staff"} attached a receipt` });
    refresh();
    return { success: true, message: "Receipt attached." };
  });
}

export async function removeReceipt(id: string): Promise<ExpenseResult> {
  return guard(async () => {
    await requireArea("billing");
    const e = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { receiptFile: true } });
    if (!e) return fail("Expense not found.");
    await prisma.expense.update({ where: { id }, data: { receiptFile: "", receiptName: "", receiptMime: "" } });
    if (e.receiptFile) await removeFile(e.receiptFile);
    refresh();
    return { success: true, message: "Receipt removed." };
  });
}

// ---------------------------------------------------------------------------
// Billable expenses
// ---------------------------------------------------------------------------

/** Add the project's unbilled "bill to client" expenses to a draft invoice as line items. */
export async function addBillableExpenses(invoiceId: string): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: { select: { position: true } } } });
      if (!inv) return fail("Invoice not found.");
      if (inv.status !== "DRAFT") return fail("Expenses can only be added to a draft invoice.");
      if (!inv.projectId) return fail("Link this invoice to a project first, then save it.");
      const rows = await tx.expense.findMany({
        where: { projectId: inv.projectId, billable: true, invoiceId: null, deletedAt: null, currency: inv.currency },
        orderBy: { spentAt: "asc" },
      });
      if (!rows.length) return fail(`No unbilled ${inv.currency} expenses for this project.`);
      let pos = inv.items.reduce((n, i) => Math.max(n, i.position), -1) + 1;
      for (const r of rows) {
        await tx.invoiceItem.create({ data: { invoiceId, description: `${r.description}${r.vendor ? ` (${r.vendor})` : ""}`.slice(0, 300), quantity: 1, unitAmount: r.amount, position: pos++ } });
        // Claim each row conditionally so two clicks cannot bill the same cost twice.
        await tx.expense.updateMany({ where: { id: r.id, invoiceId: null }, data: { invoiceId } });
      }
      return { success: true, message: `Added ${rows.length} expense${rows.length === 1 ? "" : "s"} (${formatMoney(rows.reduce((n, r) => n + r.amount, 0), inv.currency)}).`, id: inv.number };
    });
    if (result.success) {
      await logActivity({ userId: user.id, action: "updated", entityType: "Invoice", entityId: invoiceId, message: `${user.name ?? "Staff"} added billable expenses to invoice ${result.id}` });
      revalidatePath(`/admin/billing/invoices/${invoiceId}`);
      refresh();
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

export async function saveRecurringExpense(input: RecurringExpenseInput): Promise<ExpenseResult> {
  return guard(async () => {
    const user = await requireArea("billing");
    const p = parseRecurringExpenseInput(input);
    if (!p.ok) return fail(p.message);
    const r = await prisma.recurringExpense.create({ data: p.data });
    await logActivity({ userId: user.id, action: "created", entityType: "Expense", entityId: r.id, message: `${user.name ?? "Staff"} set up recurring expense: ${p.data.description}` });
    refresh();
    return { success: true, message: "Recurring expense saved.", id: r.id };
  });
}

export async function setRecurringExpenseActive(id: string, active: boolean): Promise<ExpenseResult> {
  return guard(async () => {
    await requireArea("billing");
    const done = await prisma.recurringExpense.updateMany({ where: { id }, data: { active } });
    if (!done.count) return fail("Not found.");
    refresh();
    return { success: true, message: active ? "Resumed." : "Paused." };
  });
}

export async function deleteRecurringExpense(id: string): Promise<ExpenseResult> {
  return guard(async () => {
    await requireArea("billing");
    await prisma.recurringExpense.deleteMany({ where: { id } });
    refresh();
    return { success: true, message: "Removed. Expenses already recorded are untouched." };
  });
}
