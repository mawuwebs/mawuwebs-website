import "server-only";
import { prisma } from "@/lib/prisma";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { formatDocNumber, formatMoney, totals } from "@/lib/billing";

/** Atomic per-year counter: the upsert increments and returns in one statement, so two saves never share a number. */
export async function nextNumber(tx: Pick<typeof prisma, "sequence">, kind: "invoice" | "quote") {
  const year = new Date().getFullYear();
  const row = await tx.sequence.upsert({
    where: { key: `${kind}-${year}` },
    create: { key: `${kind}-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatDocNumber(kind === "invoice" ? "INV" : "QUO", year, row.value);
}

export type DeliverResult = { ok: true; emailed: boolean; link: string; number: string; userId: string } | { ok: false; message: string };

/** Marks a draft/sent invoice as sent and emails the client link. Shared by the staff button and the recurring cron. */
export async function deliverInvoice(id: string): Promise<DeliverResult> {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true, user: { select: { name: true, email: true } } } });
  if (!inv) return { ok: false, message: "Invoice not found." };
  if (inv.status === "PAID" || inv.status === "VOID") return { ok: false, message: `This invoice is ${inv.status.toLowerCase()}.` };
  const t = totals(inv.items, inv.taxBp);
  if (t.total <= 0) return { ok: false, message: "The invoice total must be more than zero." };
  const settings = await getSiteSettings();
  const link = `${siteUrl()}/i/${inv.token}`;
  const emailed = await sendMail({
    to: inv.user.email,
    replyTo: notifyEmail(settings.contactEmail),
    subject: `Invoice ${inv.number} from ${settings.siteName}`,
    text: `Hi ${inv.user.name.split(" ")[0]},\n\nInvoice ${inv.number} for ${inv.title}: ${formatMoney(t.total, inv.currency)}${inv.dueDate ? `, due ${inv.dueDate.toLocaleDateString("en-GB")}` : ""}.\n\nView, print or pay it here:\n${link}\n\n${settings.siteName}`,
  });
  await prisma.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  return { ok: true, emailed, link, number: inv.number, userId: inv.userId };
}
