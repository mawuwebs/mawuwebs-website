import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone, Plus, Search, UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate } from "@/lib/portal";
import { balanceDue, formatMoney, isOverdue, totals } from "@/lib/billing";
import { telHref, whatsappHref } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CreateClientForm } from "@/components/admin/client-forms";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "owing", label: "Owing money" },
  { key: "tickets", label: "Open tickets" },
  { key: "invited", label: "Not signed in yet" },
  { key: "disabled", label: "Disabled" },
] as const;
const SORTS = [
  { key: "recent", label: "Newest" },
  { key: "name", label: "Name A to Z" },
  { key: "owing", label: "Most owing" },
] as const;

const chip = "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";
const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; sort?: string; add?: string }> }) {
  await guardArea("orders");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort! : "recent";

  const [clients, openInvoices] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "CLIENT",
        ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { company: { contains: q } }, { phone: { contains: q } }, { city: { contains: q } }] } : {}),
      },
      orderBy: sort === "name" ? { name: "asc" } : { createdAt: "desc" },
      include: { _count: { select: { tickets: { where: { status: { not: "RESOLVED" } } } } } },
    }),
    prisma.invoice.findMany({ where: { status: "SENT", user: { role: "CLIENT" } }, include: { items: true, payments: true } }),
  ]);

  // Money each client still owes, per currency, and whether any of it is late.
  const owing = new Map<string, { byCur: Record<string, number>; overdue: boolean; total: number }>();
  for (const inv of openInvoices) {
    const bal = balanceDue(totals(inv.items, inv.taxBp).total, inv.payments);
    if (bal <= 0) continue;
    const row = owing.get(inv.userId) ?? { byCur: {}, overdue: false, total: 0 };
    row.byCur[inv.currency] = (row.byCur[inv.currency] ?? 0) + bal;
    row.total += bal;
    if (isOverdue(inv, bal)) row.overdue = true;
    owing.set(inv.userId, row);
  }

  const all = clients;
  const rows = all
    .filter((c) =>
      filter === "owing" ? owing.has(c.id) : filter === "tickets" ? c._count.tickets > 0 : filter === "invited" ? !c.lastLoginAt && !c.disabledAt : filter === "disabled" ? !!c.disabledAt : true,
    )
    .sort((a, b) => (sort === "owing" ? (owing.get(b.id)?.total ?? 0) - (owing.get(a.id)?.total ?? 0) : 0));

  const counts = {
    all: all.length,
    owing: all.filter((c) => owing.has(c.id)).length,
    tickets: all.filter((c) => c._count.tickets > 0).length,
    invited: all.filter((c) => !c.lastLoginAt && !c.disabledAt).length,
    disabled: all.filter((c) => c.disabledAt).length,
  } as Record<string, number>;
  const totalOwing: Record<string, number> = {};
  for (const r of owing.values()) for (const [cur, n] of Object.entries(r.byCur)) totalOwing[cur] = (totalOwing[cur] ?? 0) + n;
  const owingLine = Object.entries(totalOwing).map(([cur, n]) => formatMoney(n, cur)).join(" · ") || "Nothing";
  const openTickets = all.reduce((n, c) => n + c._count.tickets, 0);

  const href = (over: { filter?: string; sort?: string; q?: string }) => {
    const p = new URLSearchParams();
    const f = over.filter ?? filter, s = over.sort ?? sort;
    const qq = over.q ?? q;
    if (qq) p.set("q", qq);
    if (f !== "all") p.set("filter", f);
    if (s !== "recent") p.set("sort", s);
    const str = p.toString();
    return `/admin/clients${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">People and businesses you work with. Each can sign in to the client portal.</p>
        </div>
        <Link href="/admin/clients?add=1#add-client" className={buttonVariants({ size: "sm" })}><UserPlus className="size-4" /> Add client</Link>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "Clients", v: String(counts.all), s: `${counts.invited} not signed in yet`, icon: Users },
          { l: "Owed to you", v: owingLine, s: `${counts.owing} client${counts.owing === 1 ? "" : "s"} with unpaid invoices`, icon: Mail },
          { l: "Open support tickets", v: String(openTickets), s: `${counts.tickets} client${counts.tickets === 1 ? "" : "s"} waiting`, icon: MessageCircle },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><k.icon className="size-4" /> {k.l}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{k.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.s}</p>
          </div>
        ))}
      </section>

      <details id="add-client" open={sp.add === "1"} className="group scroll-mt-20 rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-5 font-semibold"><Plus className="size-4" /> Add a client <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Name and email are enough to start</span></summary>
        <div className="border-t border-border p-5 sm:p-6"><CreateClientForm /></div>
      </details>

      <div className="space-y-3">
        <form action="/admin/clients" role="search" className="flex max-w-lg items-center gap-2">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input type="search" name="q" defaultValue={q} placeholder="Search name, company, email, phone or city" aria-label="Search clients" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <button className={buttonVariants({ variant: "outline", size: "sm" })}>Search</button>
          {q && <Link href={href({ q: "" })} className={buttonVariants({ variant: "ghost", size: "sm" })}>Clear</Link>}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filter clients" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => <Link key={f.key} href={href({ filter: f.key })} aria-current={filter === f.key ? "page" : undefined} className={chip}>{f.label} <span className="tabular-nums opacity-70">{counts[f.key]}</span></Link>)}
          </nav>
          <nav aria-label="Sort clients" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Sort:
            {SORTS.map((s) => <Link key={s.key} href={href({ sort: s.key })} aria-current={sort === s.key ? "page" : undefined} className={chip}>{s.label}</Link>)}
          </nav>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">{all.length === 0 && !q ? "No clients yet." : "No clients match."}</p>
          {all.length === 0 && !q && <Link href="/admin/clients?add=1#add-client" className={`${buttonVariants({ size: "sm" })} mt-3`}><UserPlus className="size-4" /> Add your first client</Link>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3 font-medium">Client</th><th className="p-3 font-medium">Contact</th><th className="p-3 text-right font-medium">Owes</th><th className="p-3 text-right font-medium">Tickets</th><th className="p-3 font-medium">Last sign-in</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const o = owing.get(c.id);
                const wa = whatsappHref(c.whatsapp || c.phone);
                const tel = telHref(c.phone);
                const initials = (c.company || c.name).split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
                return (
                  <tr key={c.id} className="transition-colors hover:bg-secondary/40">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</span>
                        <div className="min-w-0">
                          <Link href={`/admin/clients/${c.id}`} className="font-medium hover:underline">{c.company || c.name}</Link>
                          <div className="truncate text-xs text-muted-foreground">{c.company ? `${c.name}${c.jobTitle ? `, ${c.jobTitle}` : ""}` : c.jobTitle || c.email}{c.city ? ` · ${c.city}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-muted-foreground">{c.phone || <span className="italic">No phone</span>}</div>
                      <div className="mt-1.5 flex gap-1.5">
                        {tel && <a href={tel} aria-label={`Call ${c.name}`} title="Call" className={iconBtn}><Phone className="size-4" /></a>}
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} title="WhatsApp" className={iconBtn}><MessageCircle className="size-4" /></a>}
                        <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} title={c.email} className={iconBtn}><Mail className="size-4" /></a>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {o ? <span className={o.overdue ? "font-medium text-destructive" : ""}>{Object.entries(o.byCur).map(([cur, n]) => formatMoney(n, cur)).join(" · ")}{o.overdue && <span className="block text-xs">overdue</span>}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 text-right tabular-nums">{c._count.tickets || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-3">
                      {c.disabledAt ? <Badge variant="outline">Disabled</Badge> : c.lastLoginAt ? <span className="text-muted-foreground">{fmtDate(c.lastLoginAt)}</span> : <Badge variant="outline" className="border-amber-500/40 text-amber-700">Invited</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
