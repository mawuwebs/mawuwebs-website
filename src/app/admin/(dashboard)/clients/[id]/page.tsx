import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, milestonesToText, parseMilestones, totals, INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import { buttonVariants } from "@/components/ui/button";
import { ClientProjectForm, EMPTY_PROJECT } from "@/components/admin/client-project-form";
import { AddAssetForm, AddDocumentForm, ClientActions, RemoveButton } from "@/components/admin/client-forms";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await guardArea("orders");
  const { id } = await params;
  const showBilling = can((await auth())?.user?.role, "billing");
  const client = await prisma.user.findFirst({
    where: { id, role: "CLIENT" },
    include: {
      assets: { orderBy: { name: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      tickets: { orderBy: { updatedAt: "desc" }, take: 20 },
      projects: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" }, include: { items: true } },
      invoices: { orderBy: { createdAt: "desc" }, include: { items: true, payments: true } },
    },
  });
  if (!client) notFound();
  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">← Clients</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{client.company || client.name}</h1>
        <p className="text-sm text-muted-foreground">{client.name} · {client.email}{client.disabledAt ? " · access disabled" : ""}</p>
        <div className="mt-4"><ClientActions clientId={client.id} disabled={!!client.disabledAt} /></div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-medium">Add a project</summary>
          <div className="mt-4"><ClientProjectForm clientId={client.id} projectId={null} initial={EMPTY_PROJECT} /></div>
        </details>
        {client.projects.map((p) => {
          const ms = parseMilestones(p.milestones);
          return (
            <details key={p.id} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer text-sm"><span className="font-medium">{p.title}</span> <span className="text-muted-foreground">· {PROJECT_STATUS_LABEL[p.status]} · {ms.filter((m) => m.done).length}/{ms.length} milestones{p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}</span></summary>
              <div className="mt-4">
                <ClientProjectForm
                  clientId={client.id} projectId={p.id}
                  initial={{ title: p.title, summary: p.summary, status: p.status, startDate: p.startDate?.toISOString().slice(0, 10) ?? "", dueDate: p.dueDate?.toISOString().slice(0, 10) ?? "", milestones: milestonesToText(ms) }}
                />
              </div>
            </details>
          );
        })}
      </section>

      {showBilling && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Quotes and invoices</h2>
            <div className="flex gap-2">
              <Link href={`/admin/billing/quotes/new?client=${client.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>New quote</Link>
              <Link href={`/admin/billing/invoices/new?client=${client.id}`} className={buttonVariants({ size: "sm" })}>New invoice</Link>
            </div>
          </div>
          {client.quotes.length + client.invoices.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {client.invoices.map((i) => {
                const total = totals(i.items, i.taxBp).total;
                const bal = balanceDue(total, i.payments);
                return (
                  <li key={i.id}><Link href={`/admin/billing/invoices/${i.id}`} className="flex flex-wrap justify-between gap-2 p-3 text-sm hover:bg-secondary/60"><span>{i.number} · {i.title}</span><span className={isOverdue(i, bal) ? "text-destructive" : "text-muted-foreground"}>{formatMoney(total, i.currency)} · {isOverdue(i, bal) ? "Overdue" : INVOICE_STATUS_LABEL[i.status]}</span></Link></li>
                );
              })}
              {client.quotes.map((q) => (
                <li key={q.id}><Link href={`/admin/billing/quotes/${q.id}`} className="flex flex-wrap justify-between gap-2 p-3 text-sm hover:bg-secondary/60"><span>{q.number} · {q.title}</span><span className="text-muted-foreground">{formatMoney(totals(q.items, q.taxBp).total, q.currency)} · {QUOTE_STATUS_LABEL[q.status]}</span></Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Support requests</h2>
        {client.tickets.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {client.tickets.map((t) => (
              <li key={t.id}><Link href={`/admin/tickets/${t.id}`} className="flex justify-between gap-4 p-3 text-sm hover:bg-secondary/60"><span>{t.subject}</span><span className="text-muted-foreground">{ticketRef(t.id)} · {TICKET_STATUS_LABEL[t.status]}</span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Equipment and services</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><AddAssetForm clientId={client.id} /></div>
        {client.assets.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {client.assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span>{a.name} <span className="text-muted-foreground">· {a.type}{a.assignedTo ? ` · ${a.assignedTo}` : ""}{a.expiresAt ? ` · expires ${fmtDate(a.expiresAt)}` : ""}</span></span>
                <RemoveButton kind="asset" id={a.id} clientId={client.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><AddDocumentForm clientId={client.id} /></div>
        {client.documents.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {client.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span>{d.title} <span className="text-muted-foreground">· {d.kind} · {fmtDate(d.createdAt)}</span></span>
                <RemoveButton kind="document" id={d.id} clientId={client.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
