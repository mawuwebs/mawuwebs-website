import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNowStrict, startOfMonth } from "date-fns";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { BarList } from "@/components/admin/bar-list";
import { EmptyState } from "@/components/admin/list-page-header";
import { BANDS } from "@/lib/health-check";
import { parseHealthCheck } from "@/lib/health-check-admin";
import { STATUS_OPTIONS } from "@/lib/submission";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "IT health checks" };

const BAND_TONE: Record<string, string> = {
  strong: "border-success/30 bg-success/10 text-success",
  fair: "border-accent/30 bg-accent/10 text-accent",
  exposed: "border-destructive/30 bg-destructive/10 text-destructive",
  critical: "border-destructive/40 bg-destructive/15 text-destructive",
};

export default async function HealthChecksPage() {
  await guardArea("orders");
  const rows = await prisma.contactSubmission.findMany({
    where: { kind: "healthcheck" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const checks = rows.flatMap((r) => {
    const p = parseHealthCheck(r.message);
    return p ? [{ row: r, p }] : [];
  });

  const total = checks.length;
  const avg = total ? Math.round(checks.reduce((a, c) => a + c.p.percent, 0) / total) : 0;
  const hot = checks.filter((c) => c.p.bandId === "critical" || c.p.bandId === "exposed").length;
  const monthStart = startOfMonth(new Date());
  const thisMonth = checks.filter((c) => c.row.createdAt >= monthStart).length;
  const untouched = checks.filter((c) => c.row.status === "NEW").length;

  const bandItems = BANDS.map((b) => ({
    label: b.label,
    value: checks.filter((c) => c.p.bandId === b.id).length,
    tone: (b.id === "strong" ? "good" : b.id === "fair" ? "default" : "bad") as "good" | "default" | "bad",
  }));

  // How many people fell short on each question: shows what to sell and what to write about.
  const gapCounts = new Map<string, number>();
  for (const c of checks) {
    for (const a of c.p.answers) if (a.answer !== "yes") gapCounts.set(a.text, (gapCounts.get(a.text) ?? 0) + 1);
  }
  const gapItems = [...gapCounts]
    .map(([label, value]) => ({ label, value, tone: "bad" as const }))
    .sort((x, y) => y.value - x.value)
    .slice(0, 6);

  const stats = [
    { label: "Total checks", value: total },
    { label: "This month", value: thisMonth },
    { label: "Average score", value: total ? `${avg}%` : "–" },
    { label: "Exposed or critical", value: hot, tone: hot ? "text-destructive" : "" },
    { label: "Not yet opened", value: untouched, tone: untouched ? "text-accent" : "" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">IT health checks</h1>
        <p className="mt-1 text-muted-foreground">
          Leads from the free quiz on /it-health-check. Low scores are your warmest prospects.
        </p>
        <Link href="/admin/forms" className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline">
          Edit the quiz questions
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 font-display text-2xl font-bold", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState message="No health checks yet. They appear here when a visitor finishes the quiz." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Score bands</h2>
              <div className="mt-4">
                <BarList items={bandItems} />
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Most common gaps</h2>
              <p className="text-xs text-muted-foreground">Answered “Partly” or “No”.</p>
              <div className="mt-4">
                <BarList items={gapItems} />
              </div>
            </section>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Weakest areas</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {checks.map(({ row, p }) => {
                  const status = STATUS_OPTIONS.find((o) => o.value === row.status);
                  return (
                    <tr key={row.id} className={cn("border-b border-border last:border-0", row.status === "NEW" && "bg-accent/5")}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{p.company}</p>
                        <a href={`mailto:${row.email}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                          {row.email}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", BAND_TONE[p.bandId])}>
                          {p.percent}% {p.bandLabel}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">{p.weakest || "–"}</td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-muted-foreground"
                        title={format(row.createdAt, "MMM d, yyyy 'at' h:mm a")}
                      >
                        {formatDistanceToNowStrict(row.createdAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status?.style)}>
                          {status?.label ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/messages?open=${row.id}`}
                          className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline"
                        >
                          <ClipboardCheck className="size-4" />
                          Full answers
                          <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
