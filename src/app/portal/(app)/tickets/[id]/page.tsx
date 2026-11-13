import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { ReplyForm } from "@/components/site/portal-forms";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePortalUser()]);
  // Scoped to the signed-in client, and staff-only notes are never selected.
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: user.id },
    include: { replies: { where: { internal: false }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  return (
    <div className="max-w-2xl">
      <Link href="/portal/tickets" className="text-sm text-muted-foreground hover:text-foreground">← All requests</Link>
      <h1 className="mt-3 font-display text-3xl font-bold">{ticket.subject}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{ticketRef(ticket.id)} · {fmtDate(ticket.createdAt)} · {TICKET_STATUS_LABEL[ticket.status]}</p>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">You</p>
          <p className="mt-1 whitespace-pre-wrap">{ticket.body}</p>
        </div>
        {ticket.replies.map((r) => (
          <div key={r.id} className={r.staffName ? "rounded-xl border border-accent/30 bg-accent/5 p-4" : "rounded-xl border border-border bg-card p-4"}>
            <p className="text-xs text-muted-foreground">{r.staffName ?? "You"} · {fmtDate(r.createdAt)}</p>
            <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        {ticket.status === "RESOLVED" && <p className="mb-3 text-sm text-muted-foreground">Marked resolved. Replying will reopen it.</p>}
        <ReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
