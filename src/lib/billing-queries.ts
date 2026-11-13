import "server-only";
import { prisma } from "@/lib/prisma";
import { amountPaid, balanceDue, isOverdue, isQuoteExpired, totals, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import type { DocViewData } from "@/components/billing/document-view";

const itemOrder = { orderBy: { position: "asc" as const } };
const clientSel = { select: { name: true, company: true, email: true } };

export function quoteToView(q: {
  number: string; title: string; currency: string; taxBp: number; notes: string; status: keyof typeof QUOTE_STATUS_LABEL;
  validUntil: Date | null; createdAt: Date; sentAt: Date | null;
  items: { description: string; quantity: number; unitAmount: number }[];
  user: { name: string; company: string; email: string };
}): DocViewData {
  const expired = q.status === "SENT" && isQuoteExpired(q.validUntil);
  return {
    kind: "quote", number: q.number, title: q.title, currency: q.currency, taxBp: q.taxBp, notes: q.notes, items: q.items,
    issuedAt: q.sentAt ?? q.createdAt, date: q.validUntil, statusLabel: expired ? "Expired" : QUOTE_STATUS_LABEL[q.status], client: q.user,
  };
}

export function invoiceToView(i: {
  number: string; title: string; currency: string; taxBp: number; notes: string; status: keyof typeof INVOICE_STATUS_LABEL;
  dueDate: Date | null; issueDate: Date;
  items: { description: string; quantity: number; unitAmount: number }[];
  payments: { id: string; amount: number; method: string; reference: string; paidAt: Date }[];
  user: { name: string; company: string; email: string };
}): DocViewData {
  const balance = balanceDue(totals(i.items, i.taxBp).total, i.payments);
  return {
    kind: "invoice", number: i.number, title: i.title, currency: i.currency, taxBp: i.taxBp, notes: i.notes, items: i.items,
    issuedAt: i.issueDate, date: i.dueDate, statusLabel: INVOICE_STATUS_LABEL[i.status], overdue: isOverdue(i, balance),
    client: i.user, payments: i.payments,
  };
}

export const quoteInclude = { items: itemOrder, user: clientSel } as const;
export const invoiceInclude = { items: itemOrder, payments: { orderBy: { paidAt: "asc" as const } }, user: clientSel } as const;

/** Money a client still owes across sent invoices, by currency. */
export async function outstandingByCurrency(where: { userId?: string } = {}) {
  const invoices = await prisma.invoice.findMany({ where: { ...where, status: "SENT" }, include: { items: true, payments: true } });
  const out: Record<string, { due: number; overdue: number }> = {};
  for (const inv of invoices) {
    const bal = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
    if (bal <= 0) continue;
    const row = (out[inv.currency] ??= { due: 0, overdue: 0 });
    row.due += bal;
    if (isOverdue(inv, bal)) row.overdue += bal;
  }
  return out;
}

export { amountPaid };

/** Client and project choices for the editors. */
export async function editorOptions() {
  const [clients, projects] = await Promise.all([
    prisma.user.findMany({ where: { role: "CLIENT", disabledAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.clientProject.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, userId: true, title: true } }),
  ]);
  return { clients: clients.map((c) => ({ id: c.id, label: c.company ? `${c.company} (${c.name})` : c.name })), projects };
}
