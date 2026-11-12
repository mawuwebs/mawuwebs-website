import "server-only";
import { addDays, differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isUrgent, kindOf, KIND_LABEL, KIND_VALUES } from "@/lib/submission";

const OPEN = ["NEW", "READ", "RESPONDED", "QUOTED"] as const;

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (v?: string): Range => (RANGES.find((r) => String(r) === v) ?? 30) as Range;

/** Counts shown as sidebar badges. Cheap: two indexed counts. */
export async function getNavBadges() {
  const [newCount, followUps] = await Promise.all([
    prisma.contactSubmission.count({ where: { status: "NEW" } }),
    prisma.contactSubmission.count({ where: { followUpAt: { lte: new Date() }, status: { in: [...OPEN] } } }),
  ]);
  const orders = (await getOrderSummary()).total;
  return { "/admin/messages": newCount + followUps, "/admin/messages:orders": orders };
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const median = (a: number[]) => {
  if (a.length === 0) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type Kpi = {
  value: number | null;
  previous: number | null;
  series: number[];
};

export async function getDashboardData(range: Range) {
  const now = new Date();
  const today = startOfDay(now);
  const start = subDays(today, range - 1); // first day of the current window
  const prevStart = subDays(start, range); // first day of the previous window

  const [
    pages, posts, services, projects, drafts, subscribersTotal,
    statusGroups, quoted, actionRows, wonRows, tapRows, windowRows, subRows, followUps, stale, recentEnquiries, activity, publishedRows,
  ] = await Promise.all([
    prisma.page.count(),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.service.count(),
    prisma.project.count(),
    prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.newsletterSubscriber.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
    prisma.contactSubmission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contactSubmission.aggregate({ where: { status: "QUOTED" }, _sum: { quoteAmount: true } }),
    prisma.contactSubmission.findMany({
      where: { status: { in: [...OPEN] }, OR: [{ status: "NEW" }, { followUpAt: { lte: now } }] },
      orderBy: { createdAt: "asc" },
      take: 40,
    }),
    prisma.contactSubmission.findMany({
      where: { status: "WON", statusChangedAt: { gte: prevStart } },
      select: { statusChangedAt: true, quoteAmount: true },
    }),
    prisma.contactClick.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true, channel: true, page: true } }),
    prisma.contactSubmission.findMany({
      where: { createdAt: { gte: prevStart } },
      select: { createdAt: true, repliedAt: true, status: true, quoteAmount: true, kind: true, subject: true },
    }),
    prisma.newsletterSubscriber.findMany({ where: { confirmedAt: { not: null }, unsubscribedAt: null, createdAt: { gte: prevStart } }, select: { createdAt: true } }),
    prisma.contactSubmission.count({ where: { followUpAt: { lte: now }, status: { in: [...OPEN] } } }),
    prisma.contactSubmission.count({ where: { status: "NEW", createdAt: { lt: new Date(now.getTime() - 48 * 3600_000) } } }),
    prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
    prisma.post.findMany({ where: { status: "PUBLISHED", deletedAt: null, publishedAt: { gte: prevStart } }, select: { publishedAt: true } }),
  ]);

  /** Day index inside the current window (0..range-1), or the previous one as { prev: true }. */
  const locate = (d: Date) => {
    const diff = differenceInCalendarDays(d, start);
    if (diff >= 0 && diff < range) return { prev: false, i: diff };
    if (diff < 0 && diff >= -range) return { prev: true, i: diff + range };
    return null;
  };

  const daily = (dates: Date[]) => {
    const cur = new Array<number>(range).fill(0);
    const prev = new Array<number>(range).fill(0);
    for (const d of dates) {
      const l = locate(d);
      if (l) (l.prev ? prev : cur)[l.i] += 1;
    }
    return { cur, prev };
  };

  const enq = daily(windowRows.map((r) => r.createdAt));
  const subs = daily(subRows.map((r) => r.createdAt));
  const pub = daily(publishedRows.flatMap((r) => (r.publishedAt ? [r.publishedAt] : [])));

  const inCur = windowRows.filter((r) => locate(r.createdAt)?.prev === false);
  const inPrev = windowRows.filter((r) => locate(r.createdAt)?.prev === true);
  const hours = (rows: typeof windowRows) =>
    rows.flatMap((r) => (r.repliedAt ? [(r.repliedAt.getTime() - r.createdAt.getTime()) / 3600_000] : []));
  // Won value counts deals by the day they were closed.
  const wonSeries = (prev: boolean) => {
    const out = new Array<number>(range).fill(0);
    for (const r of wonRows) {
      if (!r.quoteAmount || !r.statusChangedAt) continue;
      const l = locate(r.statusChangedAt);
      if (l && l.prev === prev) out[l.i] += r.quoteAmount;
    }
    return out;
  };
  const wonCur = wonSeries(false);
  const wonPrev = wonSeries(true);

  const replyCur = median(hours(inCur));
  const replyPrev = median(hours(inPrev));

  // Cumulative subscriber growth across the current window.
  const startCount = subscribersTotal - sum(subs.cur);
  let run = startCount;
  const growth = subs.cur.map((n) => (run += n));

  const days = Array.from({ length: range }, (_, i) => addDays(start, i));
  const prevDays = Array.from({ length: range }, (_, i) => addDays(prevStart, i));

  const kinds = new Map<string, number>();
  for (const r of inCur) {
    const k = kindOf(r);
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
  }
  const byKind = KIND_VALUES.map((k) => ({ label: KIND_LABEL[k], value: kinds.get(k) ?? 0 })).sort((a, b) => b.value - a.value);

  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;
  // Direct contact taps (phone / WhatsApp / email links), this window vs the previous one.
  const tapsCur = tapRows.filter((t) => locate(t.createdAt)?.prev === false);
  const tapsPrev = tapRows.filter((t) => locate(t.createdAt)?.prev === true);
  const tapChannels = ["phone", "whatsapp", "email"] as const;
  const tapLabel = { phone: "Phone calls", whatsapp: "WhatsApp", email: "Email links" } as const;
  const byTap = tapChannels.map((c) => ({ label: tapLabel[c], value: tapsCur.filter((t) => t.channel === c).length }));
  const pageCounts = new Map<string, number>();
  for (const t of tapsCur) pageCounts.set(t.page || "/", (pageCounts.get(t.page || "/") ?? 0) + 1);
  const topTapPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const taps = { total: tapsCur.length, previous: tapsPrev.length, byChannel: byTap, topPages: topTapPages };

  const decided = (byStatus.WON ?? 0) + (byStatus.LOST ?? 0);

  const kpis: Record<"enquiries" | "reply" | "won" | "subscribers", Kpi> = {
    enquiries: { value: sum(enq.cur), previous: sum(enq.prev), series: enq.cur },
    // Reply time has no meaningful per-day series, so its card shows no sparkline.
    reply: { value: replyCur, previous: replyPrev, series: [] },
    won: { value: sum(wonCur), previous: sum(wonPrev), series: wonCur },
    subscribers: { value: sum(subs.cur), previous: sum(subs.prev), series: subs.cur },
  };

  // Most urgent first: overdue follow-ups (oldest due date), then new enquiries that have waited longest.
  const actions = [...actionRows]
    .sort((a, b) => {
      const au = isUrgent(a) && a.status === "NEW";
      const bu = isUrgent(b) && b.status === "NEW";
      if (au !== bu) return au ? -1 : 1;
      const ad = a.followUpAt && a.followUpAt <= now ? 0 : 1;
      const bd = b.followUpAt && b.followUpAt <= now ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return ad === 0
        ? a.followUpAt!.getTime() - b.followUpAt!.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, 6);

  return {
    range,
    taps,
    actions,
    kpis,
    trend: days.map((d, i) => ({
      label: format(d, "MMM d"),
      prevLabel: format(prevDays[i], "MMM d"),
      current: enq.cur[i],
      previous: enq.prev[i],
    })),
    growth: days.map((d, i) => ({ label: format(d, "MMM d"), current: growth[i] })),
    publishedInRange: sum(pub.cur),
    byKind,
    byStatus,
    totalEnquiries: Object.values(byStatus).reduce((a, b) => a + b, 0),
    newCount: byStatus.NEW ?? 0,
    followUps,
    stale,
    drafts,
    openQuotes: quoted._sum.quoteAmount ?? 0,
    winRate: decided ? Math.round(((byStatus.WON ?? 0) / decided) * 100) : null,
    subscribersTotal,
    content: { pages, posts, services, projects },
    recentEnquiries,
    activity,
  };
}

export type HealthCheck = { id: string; label: string; detail: string; href?: string };

/** Things that quietly make the site or admin weaker. Only the failing ones are returned. */
export async function getHealthChecks(userId: string): Promise<HealthCheck[]> {
  const out: HealthCheck[] = [];
  const [user, settings, published] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true, role: true } }),
    prisma.siteSettings.findFirst({ select: { contactEmail: true } }),
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
  ]);
  if (user?.role === "ADMIN" && !user.totpEnabled) {
    out.push({
      id: "2fa",
      label: "Turn on two-factor sign-in",
      detail: "Your admin account only needs a password right now.",
      href: "/admin/account",
    });
  }
  if (!process.env.SMTP_HOST) {
    out.push({
      id: "smtp",
      label: "Email isn't configured",
      detail: "Reply, notifications and password reset need SMTP settings on the server.",
    });
  }
  if (!process.env.CRON_SECRET) {
    out.push({ id: "cron", label: "Weekly digest is off", detail: "Set CRON_SECRET and schedule /api/cron/digest." });
  }
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(process.env.AUTH_URL ?? "localhost")) {
    out.push({ id: "url", label: "AUTH_URL points at localhost", detail: "Links in emails and the sitemap will be wrong." });
  }
  if (!settings?.contactEmail) {
    out.push({ id: "contact", label: "Add a contact email", detail: "Used for enquiry notifications.", href: "/admin/settings" });
  }
  if (published === 0) {
    out.push({ id: "blog", label: "Publish your first blog post", detail: "A live blog helps search traffic.", href: "/admin/posts/new" });
  }
  return out;
}

const ORDER_KINDS = ["brief", "estimate", "plan", "support"] as const;
const OVERDUE_HOURS = 24;

/**
 * Orders nobody has dealt with: still NEW, or opened (READ) but never replied to.
 * Opening an order must not silence the alert, only a reply or a status change does.
 */
export async function getOrderSummary() {
  const unhandled = {
    kind: { in: [...ORDER_KINDS] },
    OR: [{ status: "NEW" as const }, { status: "READ" as const, repliedAt: null }],
  };
  const cutoff = new Date(Date.now() - OVERDUE_HOURS * 3_600_000);
  const [grouped, supportRows, overdue, latest, byService] = await Promise.all([
    prisma.contactSubmission.groupBy({ by: ["kind"], where: unhandled, _count: { _all: true } }),
    prisma.contactSubmission.findMany({
      where: { ...unhandled, kind: "support" },
      select: { urgent: true },
    }),
    prisma.contactSubmission.count({ where: { ...unhandled, createdAt: { lte: cutoff } } }),
    prisma.contactSubmission.findFirst({
      where: unhandled,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.contactSubmission.groupBy({
      by: ["serviceSlug"],
      where: { ...unhandled, serviceSlug: { not: "" } },
      _count: { _all: true },
    }),
  ]);
  const byKind: Record<string, number> = {};
  let total = 0;
  for (const g of grouped) {
    byKind[g.kind] = g._count._all;
    total += g._count._all;
  }
  const perService: Record<string, number> = {};
  for (const g of byService) perService[g.serviceSlug] = g._count._all;
  return {
    total,
    byKind,
    urgent: supportRows.filter(isUrgent).length,
    overdue,
    overdueHours: OVERDUE_HOURS,
    latest,
    perService,
  };
}
