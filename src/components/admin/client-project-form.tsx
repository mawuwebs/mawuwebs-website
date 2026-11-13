"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_LABEL } from "@/lib/billing";
import { deleteClientProject, saveClientProject } from "@/lib/actions/billing";

export type ProjectFormValues = {
  title: string;
  summary: string;
  status: keyof typeof PROJECT_STATUS_LABEL;
  startDate: string;
  dueDate: string;
};

export const EMPTY_PROJECT: ProjectFormValues = { title: "", summary: "", status: "PLANNING", startDate: "", dueDate: "" };

const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function ClientProjectForm({ clientId, projectId, initial }: { clientId: string; projectId: string | null; initial: ProjectFormValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const [sure, setSure] = useState(false);
  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const id = projectId ?? "new";

  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveClientProject(projectId, clientId, v);
          if (!r.success) {
            toast.error(r.message);
            return;
          }
          toast.success(r.message);
          if (!projectId) setV(EMPTY_PROJECT);
          router.refresh();
        });
      }}
    >
      <div className="sm:col-span-2"><Label htmlFor={`cp-title-${id}`}>Title</Label><Input id={`cp-title-${id}`} className="mt-1.5" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={140} /></div>
      <div>
        <Label htmlFor={`cp-status-${id}`}>Status</Label>
        <select id={`cp-status-${id}`} className={selectCls} value={v.status} onChange={(e) => set("status", e.target.value as ProjectFormValues["status"])}>
          {Object.entries(PROJECT_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor={`cp-start-${id}`}>Start</Label><Input id={`cp-start-${id}`} type="date" className="mt-1.5" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
        <div><Label htmlFor={`cp-due-${id}`}>Due</Label><Input id={`cp-due-${id}`} type="date" className="mt-1.5" value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
      </div>
      <div className="sm:col-span-4"><Label htmlFor={`cp-sum-${id}`}>What the client sees</Label><Textarea id={`cp-sum-${id}`} rows={2} className="mt-1.5" value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={2000} /></div>
      <p className="sm:col-span-4 text-xs text-muted-foreground">Milestones, tasks, time and budget are managed in the project workspace after you save.</p>
      <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {projectId ? "Save project" : "Add project"}</Button>
        {projectId && (sure ? (
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => {
            const r = await deleteClientProject(projectId, clientId);
            (r.success ? toast.success : toast.error)(r.message);
            router.refresh();
          })}>Confirm: delete project</Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setSure(true)}>Delete</Button>
        ))}
      </div>
    </form>
  );
}
