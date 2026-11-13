"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createClient, addAsset, addDocument, replyAsStaff, deleteAsset, deleteDocument, generateReportNow, setClientDisabled,
  type ClientState,
} from "@/lib/actions/clients";
import { ASSET_TYPES, DOC_KINDS } from "@/lib/portal-constants";

const initial: ClientState = { success: false, message: "" };
const selectCls = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

function Msg({ s }: { s: ClientState }) {
  if (!s.message) return null;
  return <p role={s.success ? "status" : "alert"} className={s.success ? "text-sm text-success" : "text-sm text-destructive"}>{s.message}</p>;
}

function useResetOnSuccess(state: ClientState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return ref;
}

export function CreateClientForm() {
  const [state, action, pending] = useActionState(createClient, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-3">
      <div><Label htmlFor="c-name">Contact name</Label><Input id="c-name" name="name" required className="mt-1.5" /></div>
      <div><Label htmlFor="c-email">Email</Label><Input id="c-email" name="email" type="email" required className="mt-1.5" /></div>
      <div><Label htmlFor="c-company">Company</Label><Input id="c-company" name="company" className="mt-1.5" /></div>
      <div className="sm:col-span-3 space-y-2">
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add client and send invite</Button>
        <Msg s={state} />
        {state.inviteLink && (
          <p className="break-all rounded-lg bg-secondary p-3 text-xs">
            One-time invite link{state.emailed ? " (also emailed)" : ""}: {state.inviteLink}
          </p>
        )}
      </div>
    </form>
  );
}

export function AddAssetForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(addAsset.bind(null, clientId), initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2"><Label htmlFor="a-name">Name</Label><Input id="a-name" name="name" required className="mt-1.5" placeholder="Reception laptop" /></div>
      <div><Label htmlFor="a-type">Type</Label><select id="a-type" name="type" className={selectCls}>{ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><Label htmlFor="a-assigned">Assigned to</Label><Input id="a-assigned" name="assignedTo" className="mt-1.5" /></div>
      <div><Label htmlFor="a-exp">Expires</Label><Input id="a-exp" name="expiresAt" type="date" className="mt-1.5" /></div>
      <div><Label htmlFor="a-details">Details</Label><Input id="a-details" name="details" className="mt-1.5" placeholder="Model, serial..." /></div>
      <div className="sm:col-span-6 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Add item</Button>
        <Msg s={state} />
      </div>
    </form>
  );
}

export function AddDocumentForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(addDocument.bind(null, clientId), initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2"><Label htmlFor="d-title">Title</Label><Input id="d-title" name="title" required className="mt-1.5" /></div>
      <div><Label htmlFor="d-kind">Kind</Label><select id="d-kind" name="kind" className={selectCls}>{DOC_KINDS.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><Label htmlFor="d-url">File link</Label><Input id="d-url" name="url" className="mt-1.5" placeholder="https://... or /uploads/..." /></div>
      <div className="sm:col-span-4"><Label htmlFor="d-body">Or write the text here</Label><Textarea id="d-body" name="body" rows={3} className="mt-1.5" /></div>
      <div className="sm:col-span-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Share with client</Button>
        <Msg s={state} />
      </div>
    </form>
  );
}

export function StaffReplyForm({ ticketId, status }: { ticketId: string; status: string }) {
  const [state, action, pending] = useActionState(replyAsStaff.bind(null, ticketId), initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Label htmlFor="r-body">Reply</Label>
      <Textarea id="r-body" name="body" rows={5} required />
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <Label htmlFor="r-status" className="sr-only">Set status</Label>
          <select id="r-status" name="status" defaultValue={status === "OPEN" ? "IN_PROGRESS" : status} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING">Waiting for client</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" className="size-4" /> Internal note (client cannot see it)</label>
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save</Button>
      </div>
      <Msg s={state} />
    </form>
  );
}

export function ClientActions({ clientId, disabled }: { clientId: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const run = (fn: () => Promise<ClientState>) =>
    start(async () => {
      const r = await fn();
      (r.success ? toast.success : toast.error)(r.message);
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => generateReportNow(clientId))}>Create this month&apos;s report</Button>
      {disabled ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setClientDisabled(clientId, false))}>Restore access</Button>
      ) : confirming ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => { setConfirming(false); run(() => setClientDisabled(clientId, true)); }}>Confirm: disable portal access</Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>Disable access</Button>
      )}
    </div>
  );
}

export function RemoveButton({ kind, id, clientId }: { kind: "asset" | "document"; id: string; clientId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await (kind === "asset" ? deleteAsset : deleteDocument)(id, clientId); })}>
      Remove
    </Button>
  );
}
