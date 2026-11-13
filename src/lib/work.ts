/**
 * Pure rules for client project work: tasks, time and billing from time.
 * No server-only imports, so the board (client) and the server share one implementation and it is unit-testable.
 */
export const TASK_STATUSES = ["TODO", "DOING", "REVIEW", "DONE"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABEL: Record<TaskStatusValue, string> = { TODO: "To do", DOING: "In progress", REVIEW: "In review", DONE: "Done" };
export const isTaskStatus = (s: string): s is TaskStatusValue => (TASK_STATUSES as readonly string[]).includes(s);

export const PRIORITY_LABEL = ["Low", "Normal", "High"] as const;

const DAY = 86_400_000;

/** Open task whose due date has passed. A task due today is not overdue until the day ends (UTC date compare). */
export function taskIsOverdue(t: { status: string; dueDate: Date | null }, now = new Date()) {
  if (t.status === "DONE" || !t.dueDate) return false;
  return t.dueDate.getTime() + DAY <= now.getTime();
}

export function progressOf(tasks: { status: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** "3h 30m", "45m", "2h". */
export function formatMinutes(min: number) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/**
 * Accepts "1.5", "1,5", "1:30", "90m", "1h 30m", "2h". A bare number means hours.
 * Returns whole minutes between 1 and 1440, or null.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  let minutes: number | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{1,2}):([0-5]\d)$/))) minutes = Number(m[1]) * 60 + Number(m[2]);
  else if ((m = s.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?$/))) minutes = Math.round(Number(m[1]) * 60) + (m[2] ? Number(m[2]) : 0);
  else if ((m = s.match(/^(\d+)\s*m(?:in(?:ute)?s?)?$/))) minutes = Number(m[1]);
  else if ((m = s.match(/^\d+(?:\.\d+)?$/))) minutes = Math.round(Number(s) * 60);
  if (minutes === null || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return null;
  return minutes;
}

/** Amount for some minutes at an hourly rate in minor units, rounded half up. */
export const timeAmount = (minutes: number, rateMinor: number) => Math.round((minutes * rateMinor) / 60);

export type BillableEntry = { id: string; minutes: number; rateMinor: number; billable: boolean; invoiceId: string | null; note: string; taskId: string | null; task: { title: string } | null };

/**
 * Turns unbilled entries into invoice lines, one per task (entries without a task share one line).
 * Entries at different rates stay on separate lines so the maths is exact. Returns the entry ids used.
 */
export function timeInvoiceLines(entries: BillableEntry[]) {
  const unbilled = entries.filter((e) => e.billable && !e.invoiceId && e.rateMinor > 0 && e.minutes > 0);
  const groups = new Map<string, { title: string; rate: number; minutes: number; ids: string[] }>();
  for (const e of unbilled) {
    const key = `${e.taskId ?? "-"}|${e.rateMinor}`;
    const g = groups.get(key) ?? { title: e.task?.title ?? "General project work", rate: e.rateMinor, minutes: 0, ids: [] };
    g.minutes += e.minutes;
    g.ids.push(e.id);
    groups.set(key, g);
  }
  const lines = [...groups.values()].map((g) => ({
    description: `${g.title} (${formatMinutes(g.minutes)})`.slice(0, 300),
    quantity: 1,
    unitAmount: timeAmount(g.minutes, g.rate),
    minutes: g.minutes,
    ids: g.ids,
  }));
  return { lines, entryIds: lines.flatMap((l) => l.ids), minutes: lines.reduce((n, l) => n + l.minutes, 0), amount: lines.reduce((n, l) => n + l.unitAmount, 0) };
}

/** Budget use: none (no budget), ok, warn from 80%, over from 100%. */
export function budgetState(loggedMinutes: number, budgetMinutes: number) {
  if (budgetMinutes <= 0) return { state: "none" as const, pct: 0 };
  const pct = Math.round((loggedMinutes / budgetMinutes) * 100);
  return { state: pct >= 100 ? ("over" as const) : pct >= 80 ? ("warn" as const) : ("ok" as const), pct };
}

/** Project health from its open work: "late" if anything is overdue, "budget" at 80%+ of hours, "idle" if nothing moved for 14 days, else "ok". */
export function projectHealth(
  p: { status: string; dueDate: Date | null; lastActivity: Date | null; overdueTasks: number; loggedMinutes?: number; budgetMinutes?: number },
  now = new Date()
): "ok" | "late" | "budget" | "idle" {
  if (p.status === "DONE" || p.status === "ON_HOLD") return "ok";
  if (p.overdueTasks > 0 || (p.dueDate && p.dueDate.getTime() + DAY <= now.getTime())) return "late";
  if (budgetState(p.loggedMinutes ?? 0, p.budgetMinutes ?? 0).state === "over" || budgetState(p.loggedMinutes ?? 0, p.budgetMinutes ?? 0).state === "warn") return "budget";
  if (p.lastActivity && now.getTime() - p.lastActivity.getTime() > 14 * DAY) return "idle";
  return "ok";
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export type MilestoneState = "upcoming" | "awaiting-approval" | "approved" | "done";

export function milestoneState(m: { completedAt: Date | null; requiresApproval: boolean; approvedAt: Date | null }): MilestoneState {
  if (m.requiresApproval) {
    if (m.approvedAt) return "approved";
    if (m.completedAt) return "awaiting-approval";
    return "upcoming";
  }
  return m.completedAt ? "done" : "upcoming";
}
export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = { upcoming: "Upcoming", "awaiting-approval": "Waiting for client approval", approved: "Approved", done: "Done" };
export const milestoneIsFinished = (s: MilestoneState) => s === "done" || s === "approved";

// ---------------------------------------------------------------------------
// Project templates. Text format, one item per line:
//   # Milestone title +14d !approve $1500        (+Nd = due N days after the start date; $ = amount billed on approval)
//   - Task title +3d @client !high               (@client = visible to client; !high / !low = priority)
// Tasks before the first "#" line are not attached to a milestone.
// ---------------------------------------------------------------------------
export type TemplateTask = { title: string; offsetDays: number | null; clientVisible: boolean; priority: number };
export type TemplateMilestone = { title: string; offsetDays: number | null; requiresApproval: boolean; billMajor: number; tasks: TemplateTask[] };
export type ParsedTemplate = { loose: TemplateTask[]; milestones: TemplateMilestone[] };

function takeFlags(line: string) {
  let rest = line;
  const offset = rest.match(/\s\+(\d{1,3})d\b/);
  if (offset) rest = rest.replace(offset[0], "");
  const bill = rest.match(/\s\$(\d+(?:\.\d{1,2})?)\b/);
  if (bill) rest = rest.replace(bill[0], "");
  const flags = new Set([...rest.matchAll(/\s([@!][a-z]+)\b/gi)].map((m) => m[1].toLowerCase()));
  rest = rest.replace(/\s[@!][a-z]+\b/gi, "");
  return { title: rest.trim().slice(0, 160), offsetDays: offset ? Number(offset[1]) : null, billMajor: bill ? Number(bill[1]) : 0, flags };
}

export function parseTemplate(text: string): ParsedTemplate {
  const out: ParsedTemplate = { loose: [], milestones: [] };
  let count = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || count >= 200) continue;
    if (line.startsWith("#")) {
      const f = takeFlags(` ${line.replace(/^#+\s*/, "")}`);
      if (!f.title) continue;
      out.milestones.push({ title: f.title, offsetDays: f.offsetDays, requiresApproval: f.flags.has("!approve"), billMajor: f.billMajor, tasks: [] });
      count++;
    } else if (line.startsWith("-")) {
      const f = takeFlags(` ${line.replace(/^-\s*/, "")}`);
      if (!f.title) continue;
      const t: TemplateTask = { title: f.title, offsetDays: f.offsetDays, clientVisible: f.flags.has("@client"), priority: f.flags.has("!high") ? 2 : f.flags.has("!low") ? 0 : 1 };
      (out.milestones.length ? out.milestones[out.milestones.length - 1].tasks : out.loose).push(t);
      count++;
    }
  }
  return out;
}

export const templateCounts = (t: ParsedTemplate) => ({ milestones: t.milestones.length, tasks: t.loose.length + t.milestones.reduce((n, m) => n + m.tasks.length, 0) });

export function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * DAY);
}

export const STARTER_TEMPLATES = [
  {
    name: "Website build",
    description: "Discovery to launch for a business website.",
    body: `# Discovery +7d
- Kickoff call +2d @client
- Collect content and brand assets +7d @client
# Design +21d !approve
- Sitemap and wireframes +12d
- Home page design +18d @client !high
- Design revisions +21d @client
# Build +42d
- Build pages +35d
- Forms, SEO basics and analytics +38d
- Testing on phone and desktop +42d !high
# Launch +49d !approve
- Client training +46d @client
- Go live +49d @client !high
`,
  },
  {
    name: "IT setup",
    description: "Office IT onboarding: audit, setup, handover.",
    body: `# Audit +5d
- Site visit and device inventory +3d @client
- Review network, backups and security +5d
# Setup +20d
- Set up email, accounts and access +10d @client
- Configure network and Wi-Fi +14d
- Backups and security hardening +18d !high
# Handover +25d !approve
- Staff walkthrough +23d @client
- Hand over documentation +25d @client
`,
  },
] as const;

// ---------------------------------------------------------------------------
// Timesheet
// ---------------------------------------------------------------------------
/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date) {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/** Rows per person with minutes per day (Mon..Sun) for the week starting `start`. */
export function timesheetGrid(entries: { userId: string | null; userName: string; workedOn: Date; minutes: number }[], start: Date) {
  const rows = new Map<string, { name: string; days: number[]; total: number }>();
  for (const e of entries) {
    const idx = Math.floor((Date.UTC(e.workedOn.getUTCFullYear(), e.workedOn.getUTCMonth(), e.workedOn.getUTCDate()) - start.getTime()) / DAY);
    if (idx < 0 || idx > 6) continue;
    const key = e.userId ?? "former";
    const r = rows.get(key) ?? { name: e.userName, days: [0, 0, 0, 0, 0, 0, 0], total: 0 };
    r.days[idx] += e.minutes;
    r.total += e.minutes;
    rows.set(key, r);
  }
  const list = [...rows.values()].sort((a, b) => b.total - a.total);
  const dayTotals = [0, 1, 2, 3, 4, 5, 6].map((i) => list.reduce((n, r) => n + r.days[i], 0));
  return { rows: list, dayTotals, total: dayTotals.reduce((n, m) => n + m, 0) };
}

// ---------------------------------------------------------------------------
// Calendar feed (ICS)
// ---------------------------------------------------------------------------
export type CalEvent = { uid: string; summary: string; date: Date; description?: string };

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

/** Folds a content line at 75 octets as RFC 5545 requires (continuation lines start with a space). */
function icsFold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; size = 0; }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

/** All-day events only. Dates use the UTC calendar day. */
export function buildIcs(name: string, events: CalEvent[], now = new Date()) {
  const stamp = `${icsDate(now)}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mawuwebs//Client work//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${icsEscape(name)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@mawuwebs`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.date, 1))}`, `SUMMARY:${icsEscape(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------
/**
 * What a project earned against what it cost. `revenue` is what was invoiced (not void); `collected` is what was paid;
 * `expenses` are costs charged to the project. Rates are per logged hour, in minor units.
 */
export function profitability(p: { invoiced: number; collected: number; expenses: number; loggedMinutes: number; fixedPrice: number }) {
  const margin = p.invoiced - p.expenses;
  const hours = p.loggedMinutes / 60;
  return {
    margin,
    marginPct: p.invoiced > 0 ? Math.round((margin / p.invoiced) * 100) : null,
    perHour: hours > 0 ? Math.round(p.invoiced / hours) : null,
    outstanding: Math.max(0, p.invoiced - p.collected),
    toInvoice: p.fixedPrice > 0 ? Math.max(0, p.fixedPrice - p.invoiced) : null,
  };
}
