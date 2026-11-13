import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";

export const metadata: Metadata = { title: "Tickets" };

const FILTERS = [["open", "Active"], ["all", "All"], ["resolved", "Resolved"]] as const;

export default async function TicketsAdminPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await guardArea("orders");
  const f = (await searchParams).f ?? "open";
  const tickets = await prisma.ticket.findMany({
    where: f === "open" ? { status: { not: "RESOLVED" } } : f === "resolved" ? { status: "RESOLVED" } : {},
    orderBy: [{ urgent: "desc" }, { updatedAt: "desc" }],
    take: 200,
    include: { user: { select: { name: true, company: true } } },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Tickets</h1>
        <p className="text-sm text-muted-foreground">Support requests from the client portal.</p>
      </div>
      <div className="flex gap-2 text-sm">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/admin/tickets?f=${k}`} className={`rounded-full border px-3 py-1 ${f === k ? "border-accent bg-accent/10 font-medium" : "border-border"}`}>{label}</Link>
        ))}
      </div>
      {tickets.length === 0 ? <p className="text-muted-foreground">No tickets here.</p> : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tickets/${t.id}`} className="flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm hover:bg-secondary/60">
                <span><span className="font-medium">{t.subject}</span>{t.urgent && <span className="ml-2 text-xs text-destructive">Urgent</span>}<span className="block text-xs text-muted-foreground">{t.user.company || t.user.name}</span></span>
                <span className="text-muted-foreground">{ticketRef(t.id)} · {fmtDate(t.updatedAt)} · {TICKET_STATUS_LABEL[t.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
