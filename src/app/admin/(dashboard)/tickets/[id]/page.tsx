import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { StaffReplyForm } from "@/components/admin/client-forms";
import { TicketProjectLink } from "@/components/admin/work-forms";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("orders");
  const { id } = await params;
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: { user: true, replies: { orderBy: { createdAt: "asc" } }, tasks: { select: { id: true }, take: 1 } },
  });
  if (!t) notFound();
  const projects = await prisma.clientProject.findMany({ where: { userId: t.userId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } });
  const STATUS_CLS: Record<string, string> = { OPEN: "bg-primary/10 text-primary", IN_PROGRESS: "bg-accent/15 text-accent-foreground", WAITING: "bg-secondary text-muted-foreground", RESOLVED: "bg-success/15 text-success" };
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tickets</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold">{t.subject}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[t.status]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
          {t.urgent && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-[#b42318] dark:text-destructive">Urgent</span>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {ticketRef(t.id)} · <Link href={`/admin/clients/${t.userId}`} className="underline">{t.user.company || t.user.name}</Link> ({t.user.email}) · opened {fmtDate(t.createdAt)}{t.resolvedAt ? ` · resolved ${fmtDate(t.resolvedAt)}` : ""}
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t.user.name} · {fmtDate(t.createdAt)}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{t.body}</p>
        </div>
        {t.replies.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-4 ${r.internal ? "border-dashed border-muted-foreground/40 bg-secondary/40" : r.staffName ? "ml-6 border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
            <p className="text-xs text-muted-foreground">{r.staffName ?? t.user.name}{r.internal ? " · internal note" : ""} · {fmtDate(r.createdAt)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p>
          </div>
        ))}
      </div>
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4" aria-label="Project link">
        <h2 className="text-sm font-semibold">Project</h2>
        <TicketProjectLink ticketId={t.id} projects={projects} current={t.projectId ?? ""} hasTask={t.tasks.length > 0} />
        {t.projectId && <Link href={`/admin/work/${t.projectId}`} className="text-sm text-accent hover:underline">Open project workspace</Link>}
      </section>
      <StaffReplyForm ticketId={t.id} status={t.status} />
    </div>
  );
}
