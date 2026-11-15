import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Inbox, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tickets" };

const FILTERS = [["open", "Active"], ["urgent", "Urgent"], ["waiting", "Waiting on client"], ["resolved", "Resolved"], ["all", "All"]] as const;
const STATUS_CLS: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary",
  IN_PROGRESS: "bg-accent/15 text-accent-foreground",
  WAITING: "bg-secondary text-muted-foreground",
  RESOLVED: "bg-success/15 text-success",
};
const chip = "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

function ago(d: Date) {
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days < 30 ? `${days}d ago` : fmtDate(d);
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Inbox; tone?: "alert" }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4", tone === "alert" && value > 0 ? "border-destructive/30 bg-destructive/5" : "border-border")}>
      <Icon className={cn("size-5 shrink-0", tone === "alert" && value > 0 ? "text-destructive" : "text-muted-foreground")} aria-hidden />
      <div><p className="font-display text-2xl leading-none font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>
    </div>
  );
}

export default async function TicketsAdminPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await guardArea("orders");
  const raw = (await searchParams).f ?? "open";
  const f = FILTERS.some(([k]) => k === raw) ? raw : "open";
  const where =
    f === "open" ? { status: { not: "RESOLVED" as const } }
    : f === "urgent" ? { status: { not: "RESOLVED" as const }, urgent: true }
    : f === "waiting" ? { status: "WAITING" as const }
    : f === "resolved" ? { status: "RESOLVED" as const }
    : {};
  const [tickets, counts, urgentOpen] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: [{ urgent: "desc" }, { updatedAt: "desc" }],
      take: 200,
      include: { user: { select: { name: true, company: true } }, project: { select: { title: true } }, _count: { select: { replies: true } }, replies: { orderBy: { createdAt: "desc" }, take: 1, select: { staffName: true, internal: true } } },
    }),
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticket.count({ where: { urgent: true, status: { not: "RESOLVED" } } }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const active = n("OPEN") + n("IN_PROGRESS") + n("WAITING");
  // A ticket needs us when it is open/in progress and the last public message came from the client.
  const needsReply = tickets.filter((t) => (t.status === "OPEN" || t.status === "IN_PROGRESS") && !t.replies.some((r) => r.staffName && !r.internal)).length;
  const href = (k: string) => `/admin/tickets?f=${k}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tickets</h1>
        <p className="mt-1 text-muted-foreground">Support requests from the client portal.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active" value={active} icon={Inbox} />
        <Stat label="Urgent" value={urgentOpen} icon={AlertTriangle} tone="alert" />
        <Stat label="Waiting on client" value={n("WAITING")} icon={MessageSquare} />
        <Stat label="Resolved" value={n("RESOLVED")} icon={CheckCircle2} />
      </section>

      <nav aria-label="Ticket filters" className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => <Link key={k} href={href(k)} aria-current={f === k ? "page" : undefined} className={chip}>{label}</Link>)}
      </nav>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="size-6 text-success" aria-hidden />
          <p>{f === "open" ? "No active tickets. Inbox zero." : "No tickets here."}</p>
        </div>
      ) : (
        <>
          {f === "open" && needsReply > 0 && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{needsReply}</span> awaiting a reply from us.</p>}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/tickets/${t.id}`} className={cn("relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 text-sm transition-colors hover:bg-secondary/60", t.urgent && t.status !== "RESOLVED" && "bg-destructive/[0.03]")}>
                  {t.urgent && t.status !== "RESOLVED" && <span className="absolute inset-y-0 left-0 w-1 bg-destructive" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.subject}</span>
                      {t.urgent && t.status !== "RESOLVED" && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-[#b42318] dark:text-destructive">Urgent</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{[t.user.company || t.user.name, t.project?.title, ticketRef(t.id)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {t._count.replies > 0 && <span className="inline-flex items-center gap-1" title="Replies"><MessageSquare className="size-3.5" aria-hidden />{t._count.replies}</span>}
                    <span title={fmtDate(t.updatedAt)}>{ago(t.updatedAt)}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 font-medium", STATUS_CLS[t.status])}>{TICKET_STATUS_LABEL[t.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
