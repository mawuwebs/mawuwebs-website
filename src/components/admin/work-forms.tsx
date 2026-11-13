"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABEL, TASK_STATUSES, TASK_STATUS_LABEL } from "@/lib/work";
import {
  addMilestone, addProjectFile, addStaffComment, addStarterTemplates, applyTemplate, completeMilestone, createTask, createTaskFromTicket, deleteMilestone,
  deleteProjectFile, deleteTask, deleteTemplate, deleteTimeEntry, invoiceUnbilledTime, linkTicketToProject, logTime, reopenMilestone, resetCalendarToken,
  saveTemplate, setProjectDone, setProjectTerms, setTaskStatus, updateMilestone, updateTask, type WorkResult,
} from "@/lib/actions/work";

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export type StaffOption = { id: string; name: string };
export type MilestoneOption = { id: string; title: string };
export type TaskValues = { title: string; description: string; priority: number; assigneeId: string; dueDate: string; clientVisible: boolean; milestoneId: string };
export const EMPTY_TASK: TaskValues = { title: "", description: "", priority: 1, assigneeId: "", dueDate: "", clientVisible: false, milestoneId: "" };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<WorkResult>, after?: (r: WorkResult) => void) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
      if (r.success) after?.(r);
      router.refresh();
    });
  return { pending, run };
}

/** Add a task (taskId null) or edit one. */
export function TaskForm({ projectId, taskId, initial, staff, milestones, onDone }: { projectId: string; taskId: string | null; initial: TaskValues; staff: StaffOption[]; milestones: MilestoneOption[]; onDone?: () => void }) {
  const { pending, run } = useRun();
  const [v, setV] = useState(initial);
  const set = <K extends keyof TaskValues>(k: K, val: TaskValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const id = taskId ?? "new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => (taskId ? updateTask(taskId, v) : createTask(projectId, v)), () => { if (!taskId) setV(EMPTY_TASK); onDone?.(); });
      }}
    >
      <div className="sm:col-span-2"><Label htmlFor={`t-title-${id}`}>Task</Label><Input id={`t-title-${id}`} className="mt-1.5" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={160} placeholder="Design the home page" /></div>
      <div>
        <Label htmlFor={`t-who-${id}`}>Assigned to</Label>
        <select id={`t-who-${id}`} className={selectCls} value={v.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
          <option value="">Nobody yet</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`t-pri-${id}`}>Priority</Label>
          <select id={`t-pri-${id}`} className={selectCls} value={v.priority} onChange={(e) => set("priority", Number(e.target.value))}>
            {PRIORITY_LABEL.map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </div>
        <div><Label htmlFor={`t-due-${id}`}>Due</Label><Input id={`t-due-${id}`} type="date" className="mt-1.5" value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`t-ms-${id}`}>Milestone</Label>
        <select id={`t-ms-${id}`} className={selectCls} value={v.milestoneId} onChange={(e) => set("milestoneId", e.target.value)}>
          <option value="">None</option>
          {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>
      <div className="sm:col-span-4"><Label htmlFor={`t-desc-${id}`}>Notes (staff only)</Label><Textarea id={`t-desc-${id}`} rows={2} className="mt-1.5" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} /></div>
      <div className="sm:col-span-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.clientVisible} onChange={(e) => set("clientVisible", e.target.checked)} className="size-4" /> Show this task to the client</label>
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {taskId ? "Save task" : "Add task"}</Button>
      </div>
    </form>
  );
}

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <select
      aria-label="Task status"
      disabled={pending}
      value={status}
      onChange={(e) => run(() => setTaskStatus(taskId, e.target.value))}
      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
    >
      {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
    </select>
  );
}

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const { pending, run } = useRun();
  const [sure, setSure] = useState(false);
  if (!sure) return <Button type="button" size="sm" variant="ghost" onClick={() => setSure(true)}>Delete task</Button>;
  return <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteTask(taskId))}>Confirm: delete</Button>;
}

export function LogTimeForm({ projectId, tasks, hasRate }: { projectId: string; tasks: { id: string; title: string }[]; hasRate: boolean }) {
  const { pending, run } = useRun();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ duration: "", note: "", taskId: "", workedOn: today, billable: true });
  const timer = useTimer(projectId, (minutes) => setV((p) => ({ ...p, duration: String(Math.max(1, minutes)) + "m" })));
  return (
    <form
      className="grid gap-3 sm:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => logTime(projectId, v), () => setV((p) => ({ ...p, duration: "", note: "" })));
      }}
    >
      <div><Label htmlFor="tl-dur">Time</Label><Input id="tl-dur" className="mt-1.5" value={v.duration} onChange={(e) => setV({ ...v, duration: e.target.value })} placeholder="1.5 or 1:30 or 90m" required /></div>
      <div>
        <Label htmlFor="tl-task">Task</Label>
        <select id="tl-task" className={selectCls} value={v.taskId} onChange={(e) => setV({ ...v, taskId: e.target.value })}>
          <option value="">General</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      <div><Label htmlFor="tl-date">Date</Label><Input id="tl-date" type="date" className="mt-1.5" max={today} value={v.workedOn} onChange={(e) => setV({ ...v, workedOn: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label htmlFor="tl-note">What was done</Label><Input id="tl-note" className="mt-1.5" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={300} /></div>
      <div className="sm:col-span-5 flex flex-wrap items-center gap-4">
        <label className={`flex items-center gap-2 text-sm ${hasRate ? "" : "text-muted-foreground"}`}>
          <input type="checkbox" className="size-4" checked={v.billable && hasRate} disabled={!hasRate} onChange={(e) => setV({ ...v, billable: e.target.checked })} /> Billable{hasRate ? "" : " (set an hourly rate first)"}
        </label>
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Log time</Button>
        <span className="flex items-center gap-2 text-sm">
          {timer.running ? (
            <>
              <span className="tabular-nums text-muted-foreground" aria-live="off">{timer.label}</span>
              <Button type="button" size="sm" variant="outline" onClick={timer.stop}>Stop timer</Button>
              <Button type="button" size="sm" variant="ghost" onClick={timer.cancel}>Discard</Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={timer.start}>Start timer</Button>
          )}
        </span>
      </div>
    </form>
  );
}

/** Stopwatch kept in localStorage per project, so it survives reloads and navigating away. Stopping fills the time field. */
function useTimer(projectId: string, onStop: (minutes: number) => void) {
  const key = `work-timer:${projectId}`;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(key));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v > 0) { setStartedAt(v); setNow(Date.now()); }
    } catch {}
  }, [key]);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const save = (v: number | null) => {
    try { if (v) localStorage.setItem(key, String(v)); else localStorage.removeItem(key); } catch {}
  };
  const secs = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const label = `${String(Math.floor(secs / 3600)).padStart(2, "0")}:${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return {
    running: startedAt !== null,
    label,
    start: () => { const t = Date.now(); setStartedAt(t); setNow(t); save(t); },
    stop: () => {
      if (startedAt === null) return;
      onStop(Math.round((Date.now() - startedAt) / 60_000));
      setStartedAt(null); save(null);
    },
    cancel: () => { setStartedAt(null); save(null); },
  };
}

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const { pending, run } = useRun();
  return (
    <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove time entry" disabled={pending} onClick={() => run(() => deleteTimeEntry(entryId))}>
      <Trash2 className="size-4" />
    </Button>
  );
}

export function TermsForm({ projectId, rate, budgetHours, fixedPrice }: { projectId: string; rate: string; budgetHours: string; fixedPrice: string }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ rate, budgetHours, fixedPrice });
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => setProjectTerms(projectId, v)); }}>
      <div><Label htmlFor="terms-rate">Hourly rate</Label><Input id="terms-rate" className="mt-1.5 w-28" inputMode="decimal" value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} placeholder="0 = none" /></div>
      <div><Label htmlFor="terms-budget">Hours budget</Label><Input id="terms-budget" className="mt-1.5 w-28" inputMode="decimal" value={v.budgetHours} onChange={(e) => setV({ ...v, budgetHours: e.target.value })} placeholder="e.g. 40" /></div>
      <div><Label htmlFor="terms-fixed">Fixed price</Label><Input id="terms-fixed" className="mt-1.5 w-32" inputMode="decimal" value={v.fixedPrice} onChange={(e) => setV({ ...v, fixedPrice: e.target.value })} placeholder="0 = none" /></div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save terms</Button>
    </form>
  );
}

export function InvoiceTimeButton({ projectId, label, disabled }: { projectId: string; label: string; disabled: boolean }) {
  const { pending, run } = useRun();
  const router = useRouter();
  return (
    <Button type="button" size="sm" disabled={disabled || pending} onClick={() => run(() => invoiceUnbilledTime(projectId), (r) => { if (r.id) router.push(`/admin/billing/invoices/${r.id}`); })}>
      {pending && <Loader2 className="size-4 animate-spin" />} {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export type MilestoneValues = { title: string; dueDate: string; requiresApproval: boolean; billAmount: string };
export const EMPTY_MILESTONE: MilestoneValues = { title: "", dueDate: "", requiresApproval: false, billAmount: "" };

export function MilestoneForm({ projectId, milestoneId, initial, onDone }: { projectId: string; milestoneId: string | null; initial: MilestoneValues; onDone?: () => void }) {
  const { pending, run } = useRun();
  const [v, setV] = useState(initial);
  const id = milestoneId ?? "new";
  return (
    <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); run(() => (milestoneId ? updateMilestone(milestoneId, v) : addMilestone(projectId, v)), () => { if (!milestoneId) setV(EMPTY_MILESTONE); onDone?.(); }); }}>
      <div className="sm:col-span-2"><Label htmlFor={`m-title-${id}`}>Milestone</Label><Input id={`m-title-${id}`} className="mt-1.5" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required maxLength={140} placeholder="Design approved" /></div>
      <div><Label htmlFor={`m-due-${id}`}>Due</Label><Input id={`m-due-${id}`} type="date" className="mt-1.5" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></div>
      <div><Label htmlFor={`m-bill-${id}`}>Invoice on approval</Label><Input id={`m-bill-${id}`} inputMode="decimal" className="mt-1.5" value={v.billAmount} onChange={(e) => setV({ ...v, billAmount: e.target.value })} placeholder="0 = none" /></div>
      <div className="sm:col-span-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={v.requiresApproval} onChange={(e) => setV({ ...v, requiresApproval: e.target.checked })} /> Client must approve this stage</label>
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {milestoneId ? "Save milestone" : "Add milestone"}</Button>
      </div>
    </form>
  );
}

export function MilestoneActions({ milestoneId, completed, approved }: { milestoneId: string; completed: boolean; approved: boolean }) {
  const { pending, run } = useRun();
  const [sure, setSure] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {!completed && <Button type="button" size="sm" disabled={pending} onClick={() => run(() => completeMilestone(milestoneId))}>Mark complete</Button>}
      {completed && !approved && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenMilestone(milestoneId))}>Reopen</Button>}
      {sure
        ? <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteMilestone(milestoneId))}>Confirm: delete</Button>
        : <Button type="button" size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export function ApplyTemplateForm({ projectId, templates }: { projectId: string; templates: { id: string; name: string }[] }) {
  const { pending, run } = useRun();
  const [tpl, setTpl] = useState(templates[0]?.id ?? "");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  if (templates.length === 0) return <p className="text-sm text-muted-foreground">No templates yet. <Link href="/admin/work/templates" className="text-accent hover:underline">Create one</Link>.</p>;
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => applyTemplate(projectId, tpl, start)); }}>
      <div><Label htmlFor="ap-tpl">Template</Label><select id="ap-tpl" className={selectCls} value={tpl} onChange={(e) => setTpl(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div><Label htmlFor="ap-start">Starts</Label><Input id="ap-start" type="date" className="mt-1.5" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add milestones and tasks</Button>
    </form>
  );
}

export function TemplateEditor({ templateId, initial }: { templateId: string | null; initial: { name: string; description: string; body: string } }) {
  const { pending, run } = useRun();
  const [v, setV] = useState(initial);
  const [sure, setSure] = useState(false);
  const id = templateId ?? "new";
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => saveTemplate(templateId, v), () => { if (!templateId) setV({ name: "", description: "", body: "" }); }); }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor={`tp-name-${id}`}>Name</Label><Input id={`tp-name-${id}`} className="mt-1.5" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required maxLength={80} /></div>
        <div className="sm:col-span-2"><Label htmlFor={`tp-desc-${id}`}>Description</Label><Input id={`tp-desc-${id}`} className="mt-1.5" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={300} /></div>
      </div>
      <div>
        <Label htmlFor={`tp-body-${id}`}>Milestones and tasks</Label>
        <Textarea id={`tp-body-${id}`} rows={12} className="mt-1.5 font-mono text-xs" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} required placeholder={"# Design +21d !approve $1500\n- Wireframes +12d\n- Home page design +18d @client !high"} />
        <p className="mt-1.5 text-xs text-muted-foreground">Lines starting with # are milestones, lines starting with - are tasks under the milestone above. +14d = due 14 days after the start date, !approve = client must approve, $1500 = invoice on approval, @client = shown to the client, !high / !low = priority.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {templateId ? "Save template" : "Create template"}</Button>
        {templateId && (sure
          ? <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteTemplate(templateId))}>Confirm: delete</Button>
          : <Button type="button" size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>)}
      </div>
    </form>
  );
}

export function StarterTemplatesButton() {
  const { pending, run } = useRun();
  return <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => addStarterTemplates())}>Add starter templates (website, IT setup)</Button>;
}

// ---------------------------------------------------------------------------
// Conversation, files, tickets, calendar
// ---------------------------------------------------------------------------
export function StaffCommentForm({ projectId }: { projectId: string }) {
  const { pending, run } = useRun();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => addStaffComment(projectId, body, internal), () => setBody("")); }}>
      <Label htmlFor="pc-body">Message</Label>
      <Textarea id="pc-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (the client never sees it)</label>
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {internal ? "Save note" : "Send to client"}</Button>
      </div>
    </form>
  );
}

export function ProjectFileForm({ projectId }: { projectId: string }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ name: "", url: "", clientVisible: true });
  return (
    <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); run(() => addProjectFile(projectId, v), () => setV({ name: "", url: "", clientVisible: true })); }}>
      <div><Label htmlFor="pf-name">File name</Label><Input id="pf-name" className="mt-1.5" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required maxLength={140} placeholder="Design mockups (PDF)" /></div>
      <div className="sm:col-span-2"><Label htmlFor="pf-url">Link</Label><Input id="pf-url" className="mt-1.5" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} required placeholder="https://... or /uploads/..." /></div>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="size-4" checked={v.clientVisible} onChange={(e) => setV({ ...v, clientVisible: e.target.checked })} /> Client can see</label>
        <Button type="submit" size="sm" disabled={pending}>Add</Button>
      </div>
    </form>
  );
}

export function DeleteFileButton({ fileId }: { fileId: string }) {
  const { pending, run } = useRun();
  return <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove file" disabled={pending} onClick={() => run(() => deleteProjectFile(fileId))}><Trash2 className="size-4" /></Button>;
}

export function TicketProjectLink({ ticketId, projects, current, hasTask }: { ticketId: string; projects: { id: string; title: string }[]; current: string; hasTask: boolean }) {
  const { pending, run } = useRun();
  const [pid, setPid] = useState(current);
  if (projects.length === 0) return <p className="text-sm text-muted-foreground">This client has no projects to link to.</p>;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div><Label htmlFor="tk-project">Project</Label><select id="tk-project" className={selectCls} value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Not linked</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <Button type="button" size="sm" variant="outline" disabled={pending || pid === current} onClick={() => run(() => linkTicketToProject(ticketId, pid))}>Save link</Button>
      {current && !hasTask && <Button type="button" size="sm" disabled={pending} onClick={() => run(() => createTaskFromTicket(ticketId))}>Create task from ticket</Button>}
    </div>
  );
}

export function CalendarLink({ url }: { url: string | null }) {
  const { pending, run } = useRun();
  return (
    <div className="space-y-2">
      {url ? (
        <>
          <Input readOnly value={url} aria-label="Calendar subscription link" onFocus={(e) => e.currentTarget.select()} />
          <p className="text-xs text-muted-foreground">In Google Calendar choose Other calendars, From URL. In Apple Calendar choose File, New Calendar Subscription. Anyone with this link can see your tasks, so keep it private.</p>
        </>
      ) : <p className="text-sm text-muted-foreground">Create a private link to see these dates in your own calendar app.</p>}
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resetCalendarToken())}>{url ? "Make a new link (stops the old one)" : "Create calendar link"}</Button>
    </div>
  );
}

export function CompleteProjectButton({ projectId, label, done }: { projectId: string; label: string; done: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button type="button" size="sm" variant={done ? "outline" : "default"} disabled={pending} onClick={() => run(() => setProjectDone(projectId, !done))}>
      {pending && <Loader2 className="size-4 animate-spin" />} {label}
    </Button>
  );
}
