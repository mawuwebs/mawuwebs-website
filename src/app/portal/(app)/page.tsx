import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, daysFromNow, fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { buttonVariants } from "@/components/ui/button";

export default async function PortalHome() {
  const user = await requirePortalUser();
  const soon = daysFromNow(60);
  const [open, tickets, expiring, report] = await Promise.all([
    prisma.ticket.count({ where: { userId: user.id, status: { not: "RESOLVED" } } }),
    prisma.ticket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.clientAsset.findMany({ where: { userId: user.id, expiresAt: { not: null, lt: soon } }, orderBy: { expiresAt: "asc" }, take: 5 }),
    prisma.clientDocument.findFirst({ where: { userId: user.id, kind: "report" }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted-foreground">{open} open support request{open === 1 ? "" : "s"}</p>
        </div>
        <Link href="/portal/tickets/new" className={buttonVariants()}>New support request</Link>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Recent requests</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/portal/tickets/${t.id}`} className="flex items-baseline justify-between gap-4 py-3 hover:bg-secondary/60 sm:px-2">
                  <span>{t.subject} <span className="text-xs text-muted-foreground">{ticketRef(t.id)}</span></span>
                  <span className="text-sm text-muted-foreground">{TICKET_STATUS_LABEL[t.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Renewals in the next 60 days</h2>
        {expiring.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Nothing due.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {expiring.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-3 sm:px-2">
                <span>{a.name} <span className="text-xs text-muted-foreground">{a.type}</span></span>
                <span className={a.expiresAt! < new Date() ? "text-destructive" : "text-muted-foreground"}>{fmtDate(a.expiresAt!)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {report && (
        <section>
          <h2 className="font-display text-xl font-semibold">Latest report</h2>
          <Link href={`/portal/documents/${report.id}`} className="mt-3 inline-block underline underline-offset-4">{report.title}</Link>
        </section>
      )}
    </div>
  );
}
