import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { StaffReplyForm } from "@/components/admin/client-forms";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("orders");
  const { id } = await params;
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: { user: true, replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!t) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-muted-foreground hover:text-foreground">← Tickets</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.subject}</h1>
        <p className="text-sm text-muted-foreground">
          {ticketRef(t.id)} · {TICKET_STATUS_LABEL[t.status]}{t.urgent ? " · URGENT" : ""} · <Link href={`/admin/clients/${t.userId}`} className="underline">{t.user.company || t.user.name}</Link> ({t.user.email}) · {fmtDate(t.createdAt)}
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="whitespace-pre-wrap text-sm">{t.body}</p></div>
        {t.replies.map((r) => (
          <div key={r.id} className={`rounded-xl border p-4 ${r.internal ? "border-dashed border-muted-foreground/40 bg-secondary/40" : r.staffName ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
            <p className="text-xs text-muted-foreground">{r.staffName ?? t.user.name}{r.internal ? " · internal note" : ""} · {fmtDate(r.createdAt)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p>
          </div>
        ))}
      </div>
      <StaffReplyForm ticketId={t.id} status={t.status} />
    </div>
  );
}
