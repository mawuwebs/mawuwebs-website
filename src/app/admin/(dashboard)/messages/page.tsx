import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, Download, FileText, Inbox, Sparkles, Trophy } from "lucide-react";
import { EnquiriesTable } from "@/components/admin/enquiries-table";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_OPTIONS, KIND_LABEL, KIND_VALUES } from "@/lib/submission";
import { ENQUIRY_PAGE_SIZE, buildEnquiryWhere } from "@/lib/submission-query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

type Params = { status?: string; type?: string; q?: string; follow?: string; service?: string; sort?: string; page?: string; open?: string };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { status, type, q, follow, service } = params;
  const sort = ["oldest", "followup"].includes(params.sort ?? "") ? params.sort : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const filters = { status, type, q, follow, service };
  const baseWhere = buildEnquiryWhere(filters);
  // "Follow-up soonest" only makes sense for enquiries that have a follow-up date.
  const where = sort === "followup" ? { AND: [baseWhere, { followUpAt: { not: null } }] } : baseWhere;
  const orderBy =
    sort === "oldest" ? { createdAt: "asc" as const } : sort === "followup" ? { followUpAt: "asc" as const } : { createdAt: "desc" as const };
  // Status chips show counts for the current search/type, not for the chosen status itself.
  const countWhere = buildEnquiryWhere({ type, q, follow, service });

  const [session, pageRows, total, grouped, dueCount, openRow] = await Promise.all([
    auth(),
    prisma.contactSubmission.findMany({
      where,
      orderBy,
      take: ENQUIRY_PAGE_SIZE,
      skip: (page - 1) * ENQUIRY_PAGE_SIZE,
    }),
    prisma.contactSubmission.count({ where }),
    prisma.contactSubmission.groupBy({ by: ["status"], where: countWhere, _count: { _all: true } }),
    prisma.contactSubmission.count({
      where: { followUpAt: { lte: new Date() }, status: { in: ["NEW", "READ", "RESPONDED", "QUOTED"] } },
    }),
    params.open ? prisma.contactSubmission.findUnique({ where: { id: params.open } }) : null,
  ]);
  // A deep link (?open=id) shows that enquiry first even if it isn't on this page or filter.
  const rows = openRow && !pageRows.some((r) => r.id === openRow.id) ? [openRow, ...pageRows] : pageRows;

  const counts: Record<string, number> = {};
  let all = 0;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    all += g._count._all;
  }

  const href = (next: Partial<Params>) => {
    const merged: Params = { status, type, q, follow, service, sort, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v && k !== "page") qs.set(k, v);
    const s = qs.toString();
    return `/admin/messages${s ? `?${s}` : ""}`;
  };
  const exportHref = `/admin/messages/export${(() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `?${s}` : "";
  })()}`;

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
      active ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
    );
  const filtered = Boolean(status || type || q || follow || service || sort);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Project briefs, estimates and messages from your website, with a simple pipeline.
          </p>
        </div>
        <a href={exportHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download className="size-4" />
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "New", value: counts.NEW ?? 0, to: href({ status: "NEW" }), tone: "text-accent", Icon: Sparkles },
          { label: "Follow-ups due", value: dueCount, to: href({ follow: "due" }), tone: dueCount > 0 ? "text-destructive" : "", Icon: AlarmClock },
          { label: "Quoted", value: counts.QUOTED ?? 0, to: href({ status: "QUOTED" }), tone: "", Icon: FileText },
          { label: "Won", value: counts.WON ?? 0, to: href({ status: "WON" }), tone: "text-success", Icon: Trophy },
        ].map((c) => (
          <Link
            key={c.label}
            href={c.to}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className={cn("mt-1 font-display text-2xl font-bold", c.tone)}>{c.value}</p>
            </div>
            <c.Icon className={cn("size-5 text-muted-foreground/50 transition-colors group-hover:text-foreground/70", c.tone)} />
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Search name, email, subject or message" className="max-w-md flex-1" />
        {filtered && (
          <Link href="/admin/messages" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Clear filters
          </Link>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} enquir{total === 1 ? "y" : "ies"}
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          <span className="w-full text-xs sm:w-14 font-medium uppercase tracking-wide text-muted-foreground">Status</span>
          <Link href={href({ status: undefined })} className={pill(!status)}>
            All ({all})
          </Link>
          {STATUS_OPTIONS.map((o) => (
            <Link key={o.value} href={href({ status: o.value })} className={pill(status === o.value)}>
              {o.label} ({counts[o.value] ?? 0})
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by type">
          <span className="w-full text-xs sm:w-14 font-medium uppercase tracking-wide text-muted-foreground">Type</span>
          <Link href={href({ type: undefined })} className={pill(!type)}>
            Any type
          </Link>
          {KIND_VALUES.map((k) => (
            <Link key={k} href={href({ type: k })} className={pill(type === k)}>
              {KIND_LABEL[k]}
            </Link>
          ))}
          <Link
            href={href({ follow: follow === "due" ? undefined : "due" })}
            className={cn(pill(follow === "due"), follow !== "due" && dueCount > 0 && "border-destructive/40 text-destructive")}
          >
            Follow-ups due ({dueCount})
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort order">
          <span className="w-full text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-14">Sort</span>
          <Link href={href({ sort: undefined })} className={pill(!sort)}>
            Newest
          </Link>
          <Link href={href({ sort: "oldest" })} className={pill(sort === "oldest")}>
            Oldest
          </Link>
          <Link href={href({ sort: "followup" })} className={pill(sort === "followup")}>
            Follow-up soonest
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            {filtered ? "Nothing matches these filters." : "No enquiries yet. They'll appear here as soon as someone writes in."}
          </p>
          {filtered && (
            <Link href="/admin/messages" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <EnquiriesTable rows={rows} canDelete={session?.user?.role === "ADMIN"} openId={openRow?.id} />
          <Pagination
            basePath="/admin/messages"
            params={{ status, type, q, follow, service, sort }}
            page={page}
            pageSize={ENQUIRY_PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </div>
  );
}
