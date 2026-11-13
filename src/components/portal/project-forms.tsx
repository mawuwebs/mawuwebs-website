"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveMilestone, postClientComment, requestWork, type PortalWorkResult } from "@/lib/actions/portal-work";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<PortalWorkResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
      if (r.success) after?.();
      router.refresh();
    });
  return { pending, run };
}

export function ApproveButton({ milestoneId, title }: { milestoneId: string; title: string }) {
  const { pending, run } = useRun();
  const [sure, setSure] = useState(false);
  if (!sure) return <Button type="button" size="sm" onClick={() => setSure(true)}>Review and approve</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Approve &ldquo;{title}&rdquo;?</span>
      <Button type="button" size="sm" disabled={pending} onClick={() => run(() => approveMilestone(milestoneId))}>{pending && <Loader2 className="size-4 animate-spin" />} Yes, approve</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setSure(false)}>Not yet</Button>
    </div>
  );
}

export function ClientCommentForm({ projectId }: { projectId: string }) {
  const { pending, run } = useRun();
  const [body, setBody] = useState("");
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => postClientComment(projectId, body), () => setBody("")); }}>
      <Label htmlFor="cc-body">Write to us</Label>
      <Textarea id="cc-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required />
      <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Send message</Button>
    </form>
  );
}

export function RequestWorkForm({ projectId }: { projectId: string }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ title: "", details: "" });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => requestWork(projectId, v), () => setV({ title: "", details: "" })); }}>
      <div><Label htmlFor="rq-title">What do you need?</Label><Input id="rq-title" className="mt-1.5" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required minLength={3} maxLength={160} placeholder="Add a booking form to the contact page" /></div>
      <div><Label htmlFor="rq-details">Details (optional)</Label><Textarea id="rq-details" rows={3} className="mt-1.5" value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} maxLength={4000} /></div>
      <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Send request</Button>
    </form>
  );
}
