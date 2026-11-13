import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { fmtDate, ticketRef, TICKET_STATUS_LABEL } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, totals, INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/billing";
import { telHref, whatsappHref } from "@/lib/phone";
import { Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RecurringForm, RecurringRowActions } from "@/components/admin/recurring-forms";
import { ClientProjectForm, EMPTY_PROJECT } from "@/components/admin/client-project-form";
import { AddAssetForm, AddDocumentForm, ClientActions, EditClientForm, RemoveButton } from "@/components/admin/client-forms";

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
      projects: { orderBy: { createdAt: "desc" }, include: { milestoneRows: { select: { completedAt: true } } } },
      quotes: { orderBy: { createdAt: "desc" }, include: { items: true } },
      invoices: { orderBy: { createdAt: "desc" }, include: { items: true, payments: true } },
      recurring: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  // Money position across everything billed to this client.
  const owes: Record<string, number> = {};
  let overdueAny = false;
  const billed: Record<string, number> = {};
  const paid: Record<string, number> = {};
  for (const i of client.invoices) {
    if (i.status === "DRAFT" || i.status === "VOID") continue;
    const t = totals(i.items, i.taxBp).total;
    const bal = balanceDue(t, i.payments);
    billed[i.currency] = (billed[i.currency] ?? 0) + t;
    paid[i.currency] = (paid[i.currency] ?? 0) + (t - bal);
    if (i.status === "SENT" && bal > 0) { owes[i.currency] = (owes[i.currency] ?? 0) + bal; if (isOverdue(i, bal)) overdueAny = true; }
  }
  const line = (m: Record<string, number>) => Object.entries(m).map(([c, n]) => formatMoney(n, c)).join(" · ") || "—";
  const openTickets = client.tickets.filter((t) => t.status !== "RESOLVED").length;
  const tel = telHref(client.phone);
  const wa = whatsappHref(client.whatsapp || client.phone);
  const place = [client.city, client.country].filter(Boolean).join(", ");
  const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">← Clients</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{client.company || client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client.name}{client.jobTitle ? `, ${client.jobTitle}` : ""}{client.disabledAt ? " · access disabled" : client.lastLoginAt ? ` · last signed in ${fmtDate(client.lastLoginAt)}` : " · invited, not signed in yet"}
            </p>
          </div>
          {showBilling && (
            <div className="flex gap-2">
              <Link href={`/admin/billing/quotes/new?client=${client.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>New quote</Link>
              <Link href={`/admin/billing/invoices/new?client=${client.id}`} className={buttonVariants({ size: "sm" })}>New invoice</Link>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
            <h2 className="font-semibold">Contact</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></li>
              {client.billingEmail && <li className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" />Invoices to {client.billingEmail}</li>}
              <li className="flex flex-wrap items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {client.phone ? <a href={tel ?? undefined} className="hover:underline">{client.phone}</a> : <span className="italic text-muted-foreground">No phone yet. Add one below.</span>}
                {tel && <a href={tel} aria-label="Call" title="Call" className={iconBtn}><Phone className="size-4" /></a>}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp" className={iconBtn}><MessageCircle className="size-4" /></a>}
              </li>
              {client.whatsapp && client.whatsapp !== client.phone && <li className="flex items-center gap-2 text-muted-foreground"><MessageCircle className="size-4" />WhatsApp {client.whatsapp}</li>}
              {(client.address || place) && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="whitespace-pre-line">{[client.address, place].filter(Boolean).join("\n")}</span></li>}
              {client.website && <li className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" /><a href={client.website} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">{client.website.replace(/^https?:\/\//, "")}</a></li>}
            </ul>
            {(client.industry || client.source || client.taxId) && (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                {[client.industry, client.source && `Found us via ${client.source}`, client.taxId && `Tax ID ${client.taxId}`].filter(Boolean).join(" · ")}
              </p>
            )}
            {client.notes && <p className="whitespace-pre-line rounded-lg bg-secondary/60 p-3 text-xs"><span className="font-semibold">Internal note: </span>{client.notes}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 self-start">
            {showBilling && (
              <>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Owes now</p><p className={`mt-1 font-display text-lg font-bold tabular-nums ${overdueAny ? "text-destructive" : ""}`}>{line(owes)}</p>{overdueAny && <p className="text-xs text-destructive">includes overdue</p>}</div>
                <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Paid to date</p><p className="mt-1 font-display text-lg font-bold tabular-nums">{line(paid)}</p></div>
              </>
            )}
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Open tickets</p><p className="mt-1 font-display text-lg font-bold">{openTickets}</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Projects</p><p className="mt-1 font-display text-lg font-bold">{client.projects.length}</p></div>
          </div>
        </div>

        <details className="rounded-2xl border border-border bg-card">
          <summary className="cursor-pointer p-5 text-sm font-semibold">Edit details</summary>
          <div className="border-t border-border p-5 sm:p-6">
            <EditClientForm
              clientId={client.id}
              initial={{
                name: client.name, email: client.email, company: client.company, jobTitle: client.jobTitle, phone: client.phone, whatsapp: client.whatsapp, billingEmail: client.billingEmail,
                address: client.address, city: client.city, country: client.country, website: client.website, taxId: client.taxId, industry: client.industry, source: client.source, notes: client.notes,
              }}
            />
          </div>
        </details>
        <ClientActions clientId={client.id} disabled={!!client.disabledAt} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer text-sm font-medium">Add a project</summary>
          <div className="mt-4"><ClientProjectForm clientId={client.id} projectId={null} initial={EMPTY_PROJECT} /></div>
        </details>
        {client.projects.map((p) => {
          const ms = p.milestoneRows;
          return (
            <details key={p.id} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer text-sm"><span className="font-medium">{p.title}</span> <Link href={`/admin/work/${p.id}`} className="text-accent hover:underline">Open workspace</Link> <span className="text-muted-foreground">· {PROJECT_STATUS_LABEL[p.status]} · {ms.filter((m) => m.completedAt).length}/{ms.length} milestones{p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}</span></summary>
              <div className="mt-4">
                <ClientProjectForm
                  clientId={client.id} projectId={p.id}
                  initial={{ title: p.title, summary: p.summary, status: p.status, startDate: p.startDate?.toISOString().slice(0, 10) ?? "", dueDate: p.dueDate?.toISOString().slice(0, 10) ?? "" }}
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

      {showBilling && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recurring billing</h2>
          <details className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer text-sm font-medium">Set up recurring billing (managed plans)</summary>
            <div className="mt-4"><RecurringForm clientId={client.id} /></div>
          </details>
          {client.recurring.length > 0 && (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {client.recurring.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <span>{r.title} <span className="text-muted-foreground">· {formatMoney(r.unitAmount, r.currency)} every {r.intervalMonths === 1 ? "month" : `${r.intervalMonths} months`} · {r.active ? `next ${fmtDate(r.nextRunAt)}` : "paused"}{r.autoSend ? " · auto-email" : " · draft"}</span></span>
                  <RecurringRowActions id={r.id} clientId={client.id} active={r.active} />
                </li>
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
                <span>{a.name} <span className="text-muted-foreground">· {a.type}{a.assignedTo ? ` · ${a.assignedTo}` : ""}{a.expiresAt ? ` · expires ${fmtDate(a.expiresAt)}` : ""}{a.monitorUrl ? (a.monitorDownSince ? " · DOWN since " + fmtDate(a.monitorDownSince) : a.monitorCheckedAt ? " · monitored, up" : " · monitored") : ""}</span></span>
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
