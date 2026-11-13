import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guardArea } from "@/lib/guard-area";
import { getCalendarEvents } from "@/lib/work-calendar";
import { addDays } from "@/lib/work";
import { siteUrl } from "@/lib/mail";
import { CalendarLink } from "@/components/admin/work-forms";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Work calendar" };

const KIND_STYLE = { task: "bg-primary/10 text-foreground", milestone: "bg-accent/15 text-foreground", project: "bg-destructive/5 text-[#b42318] dark:text-destructive", renewal: "bg-secondary text-muted-foreground" } as const;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function WorkCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await guardArea("orders");
  const session = await auth();
  const raw = (await searchParams).month;
  const base = raw && /^\d{4}-\d{2}$/.test(raw) ? new Date(`${raw}-01T12:00:00Z`) : new Date();
  const ref = Number.isNaN(base.getTime()) ? new Date() : base;
  const monthStart = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));
  const gridStart = addDays(monthStart, -((monthStart.getUTCDay() + 6) % 7));
  const weeks = Math.ceil((monthEnd.getTime() - gridStart.getTime()) / (7 * 86_400_000));
  const gridEnd = addDays(gridStart, weeks * 7);
  const [events, me] = await Promise.all([
    getCalendarEvents({ from: gridStart, to: gridEnd }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { calendarToken: true } }),
  ]);
  const byDay = new Map<string, typeof events>();
  for (const e of events) byDay.set(iso(e.date), [...(byDay.get(iso(e.date)) ?? []), e]);
  const prev = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));
  const ym = (d: Date) => d.toISOString().slice(0, 7);
  const todayIso = iso(new Date());

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/work" className="text-sm text-muted-foreground hover:text-foreground">← Client work</Link>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Work calendar</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/admin/work/calendar?month=${ym(prev)}`} className="text-accent hover:underline">← {prev.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}</Link>
          <span className="font-medium">{monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
          <Link href={`/admin/work/calendar?month=${ym(next)}`} className="text-accent hover:underline">{next.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} →</Link>
          <Link href="/admin/work/calendar" className="text-muted-foreground hover:underline">This month</Link>
        </div>
      </div>

      <div className="hidden gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid md:grid-cols-7">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-secondary/60 p-2 text-xs font-medium text-muted-foreground">{d}</div>)}
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const day = addDays(gridStart, i);
          const list = byDay.get(iso(day)) ?? [];
          const inMonth = day >= monthStart && day < monthEnd;
          return (
            <div key={i} className={cn("min-h-28 space-y-1 bg-card p-2", !inMonth && "bg-card/60 text-muted-foreground")}>
              <p className={cn("text-xs", iso(day) === todayIso && "font-bold text-accent")}>{day.getUTCDate()}</p>
              {list.slice(0, 4).map((e) => <Link key={e.uid} href={e.href} title={`${e.summary} (${e.description})`} className={cn("block truncate rounded px-1.5 py-0.5 text-xs", KIND_STYLE[e.kind], e.late && "ring-1 ring-destructive/50")}>{e.summary}</Link>)}
              {list.length > 4 && <p className="text-xs text-muted-foreground">+{list.length - 4} more</p>}
            </div>
          );
        })}
      </div>

      <section className="space-y-3 md:hidden" aria-label="Agenda">
        {events.filter((e) => e.date >= monthStart && e.date < monthEnd).length === 0 ? <p className="text-sm text-muted-foreground">Nothing is due this month.</p> : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {events.filter((e) => e.date >= monthStart && e.date < monthEnd).map((e) => (
              <li key={e.uid}><Link href={e.href} className="flex justify-between gap-3 p-3 text-sm"><span>{e.summary}</span><span className={cn("shrink-0 text-xs", e.late ? "text-destructive" : "text-muted-foreground")}>{e.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">Tasks, milestones, project deadlines and client item renewals. Red outline = overdue.</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscribe in your calendar app</h2>
        <CalendarLink url={me?.calendarToken ? `${siteUrl()}/api/calendar/${me.calendarToken}.ics` : null} />
      </section>
    </div>
  );
}
