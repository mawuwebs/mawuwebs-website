import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHOD_LABEL, amountPaid, csvCell, totals } from "@/lib/billing";

export const dynamic = "force-dynamic";

const money = (minor: number) => Number((minor / 100).toFixed(2));
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** CSV for the accountant: ?kind=invoices|payments&year=2026 (year optional). Amounts are in major units. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(session.user.role, "billing")) return new NextResponse("Forbidden", { status: 403 });

  const p = request.nextUrl.searchParams;
  const kind = p.get("kind") === "payments" ? "payments" : "invoices";
  const yearRaw = p.get("year");
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const d = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);
  const f = d(p.get("from")), t = d(p.get("to"));
  const range = f && t && t >= f ? { gte: f, lt: new Date(+t + 864e5) } : year ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } : undefined;

  let header: string[];
  let rows: (string | number)[][];
  if (kind === "invoices") {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: "DRAFT" }, ...(range ? { issueDate: range } : {}) },
      orderBy: { issueDate: "asc" },
      include: { items: true, payments: true, user: { select: { name: true, company: true } } },
    });
    header = ["Number", "Issue date", "Due date", "Client", "Company", "Title", "Status", "Currency", "Subtotal", "Tax", "Total", "Paid", "Balance"];
    rows = invoices.map((i) => {
      const t = totals(i.items, i.taxBp);
      const paid = amountPaid(i.payments);
      return [i.number, day(i.issueDate), day(i.dueDate), i.user.name, i.user.company, i.title, i.status, i.currency, money(t.subtotal), money(t.tax), money(t.total), money(paid), money(i.status === "VOID" ? 0 : t.total - paid)];
    });
  } else {
    const payments = await prisma.payment.findMany({
      where: range ? { paidAt: range } : {},
      orderBy: { paidAt: "asc" },
      include: { invoice: { select: { number: true, currency: true, user: { select: { name: true, company: true } } } } },
    });
    header = ["Date", "Invoice", "Client", "Company", "Method", "Reference", "Currency", "Amount (negative = refund)"];
    rows = payments.map((x) => [day(x.paidAt), x.invoice.number, x.invoice.user.name, x.invoice.user.company, PAYMENT_METHOD_LABEL[x.method] ?? x.method, x.reference, x.invoice.currency, money(x.amount)]);
  }

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}${year ? `-${year}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
