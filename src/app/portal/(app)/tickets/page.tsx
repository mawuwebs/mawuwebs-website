import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { buttonVariants } from "@/components/ui/button";

export default async function TicketsPage() {
  const user = await requirePortalUser();
  const tickets = await prisma.ticket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 200 });
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Support requests</h1>
        <Link href="/portal/tickets/new" className={buttonVariants()}>New request</Link>
      </div>
      {tickets.length === 0 ? (
        <p className="mt-6 text-muted-foreground">You have not raised any requests yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/portal/tickets/${t.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-4 hover:bg-secondary/60 sm:px-2">
                <span className="font-medium">{t.subject} {t.urgent && <span className="ml-1 text-xs text-destructive">Urgent</span>}</span>
                <span className="text-sm text-muted-foreground">{ticketRef(t.id)} · {fmtDate(t.createdAt)} · {TICKET_STATUS_LABEL[t.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
