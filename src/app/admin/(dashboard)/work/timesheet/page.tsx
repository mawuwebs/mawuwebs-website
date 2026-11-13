import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { addDays, formatMinutes, timesheetGrid, weekStart } from "@/lib/work";

export const metadata: Metadata = { title: "Timesheet" };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function TimesheetPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await guardArea("orders");
  const raw = (await searchParams).week;
  const parsed = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date();
  const start = weekStart(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  const end = addDays(start, 7);
  const entries = await prisma.timeEntry.findMany({
    where: { workedOn: { gte: start, lt: end } },
    include: { user: { select: { name: true } }, project: { select: { id: true, title: true } } },
  });
  const grid = timesheetGrid(entries.map((e) => ({ userId: e.userId, userName: e.user?.name ?? "Former staff", workedOn: e.workedOn, minutes: e.minutes })), start);
  const byProject = new Map<string, { title: string; minutes: number }>();
  for (const e of entries) byProject.set(e.project.id, { title: e.project.title, minutes: (byProject.get(e.project.id)?.minutes ?? 0) + e.minutes });
  const projects = [...byProject.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
  const label = `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to ${addDays(start, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/work" className="text-sm text-muted-foreground hover:text-foreground">← Client work</Link>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Timesheet</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/admin/work/timesheet?week=${iso(addDays(start, -7))}`} className="text-accent hover:underline">← Previous week</Link>
          <span className="font-medium">{label}</span>
          <Link href={`/admin/work/timesheet?week=${iso(addDays(start, 7))}`} className="text-accent hover:underline">Next week →</Link>
          <Link href="/admin/work/timesheet" className="text-muted-foreground hover:underline">This week</Link>
        </div>
      </div>
      {grid.rows.length === 0 ? <p className="text-muted-foreground">No time was logged this week.</p> : (
        <div className="relative overflow-x-auto rounded-2xl border border-border bg-card" tabIndex={0} role="region" aria-label="Timesheet for the week">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="p-3 text-left font-medium">Who</th>
                {DAYS.map((d, i) => <th key={d} className="p-3 text-right font-medium">{d} {addDays(start, i).getUTCDate()}</th>)}
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((r) => (
                <tr key={r.name} className="border-b border-border">
                  <td className="p-3 font-medium">{r.name}</td>
                  {r.days.map((m, i) => <td key={i} className="p-3 text-right tabular-nums text-muted-foreground">{m ? formatMinutes(m) : "·"}</td>)}
                  <td className="p-3 text-right font-semibold tabular-nums">{formatMinutes(r.total)}</td>
                </tr>
              ))}
              <tr>
                <td className="p-3 text-xs text-muted-foreground">All staff</td>
                {grid.dayTotals.map((m, i) => <td key={i} className="p-3 text-right tabular-nums text-xs text-muted-foreground">{m ? formatMinutes(m) : "·"}</td>)}
                <td className="p-3 text-right font-semibold tabular-nums">{formatMinutes(grid.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {projects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">By project</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {projects.map(([id, p]) => (
              <li key={id}><Link href={`/admin/work/${id}`} className="flex justify-between gap-3 p-3 text-sm hover:bg-secondary/60"><span>{p.title}</span><span className="tabular-nums text-muted-foreground">{formatMinutes(p.minutes)}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
