"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createClient, updateClient, addAsset, addDocument, replyAsStaff, deleteAsset, deleteDocument, generateReportNow, setClientDisabled,
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

export type ClientProfile = {
  name: string; email: string; company: string; jobTitle: string; phone: string; whatsapp: string; billingEmail: string;
  address: string; city: string; country: string; website: string; taxId: string; industry: string; source: string; notes: string;
};
export const EMPTY_PROFILE: ClientProfile = {
  name: "", email: "", company: "", jobTitle: "", phone: "", whatsapp: "", billingEmail: "", address: "", city: "", country: "Ghana", website: "", taxId: "", industry: "", source: "", notes: "",
};
const SOURCES = ["Website enquiry", "Referral", "Social media", "WhatsApp", "Event", "Existing relationship", "Other"];

function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The full set of client fields. `p` prefixes ids so two forms can sit on one page. */
function ClientFields({ p, v, extraOpen }: { p: string; v: ClientProfile; extraOpen?: boolean }) {
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Contact</legend>
        <Field id={`${p}-name`} label="Contact name"><Input id={`${p}-name`} name="name" required defaultValue={v.name} autoComplete="off" /></Field>
        <Field id={`${p}-company`} label="Company"><Input id={`${p}-company`} name="company" defaultValue={v.company} /></Field>
        <Field id={`${p}-email`} label="Email" hint="Also their portal sign-in."><Input id={`${p}-email`} name="email" type="email" required defaultValue={v.email} /></Field>
        <Field id={`${p}-phone`} label="Phone" hint="Local numbers like 024 123 4567 work."><Input id={`${p}-phone`} name="phone" type="tel" inputMode="tel" defaultValue={v.phone} placeholder="024 123 4567" /></Field>
        <Field id={`${p}-whatsapp`} label="WhatsApp" hint="Only if different from the phone."><Input id={`${p}-whatsapp`} name="whatsapp" type="tel" inputMode="tel" defaultValue={v.whatsapp} /></Field>
        <Field id={`${p}-job`} label="Job title"><Input id={`${p}-job`} name="jobTitle" defaultValue={v.jobTitle} placeholder="Operations manager" /></Field>
      </fieldset>

      <details open={extraOpen} className="group rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Address and billing details</summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          <Field id={`${p}-address`} label="Address" className="sm:col-span-2"><Input id={`${p}-address`} name="address" defaultValue={v.address} autoComplete="off" /></Field>
          <Field id={`${p}-city`} label="City"><Input id={`${p}-city`} name="city" defaultValue={v.city} /></Field>
          <Field id={`${p}-country`} label="Country"><Input id={`${p}-country`} name="country" defaultValue={v.country} /></Field>
          <Field id={`${p}-tax`} label="Tax ID (TIN / VAT)" hint="Printed on their invoices."><Input id={`${p}-tax`} name="taxId" defaultValue={v.taxId} /></Field>
          <Field id={`${p}-bill`} label="Billing email" hint="Invoices go here instead of the sign-in email."><Input id={`${p}-bill`} name="billingEmail" type="email" defaultValue={v.billingEmail} /></Field>
        </div>
      </details>

      <details open={extraOpen} className="group rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Business and internal notes</summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          <Field id={`${p}-site`} label="Website"><Input id={`${p}-site`} name="website" inputMode="url" defaultValue={v.website} placeholder="example.com" /></Field>
          <Field id={`${p}-industry`} label="Industry"><Input id={`${p}-industry`} name="industry" defaultValue={v.industry} placeholder="Retail, clinic, school..." /></Field>
          <Field id={`${p}-source`} label="How they found us">
            <input id={`${p}-source`} name="source" list={`${p}-sources`} defaultValue={v.source} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            <datalist id={`${p}-sources`}>{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field id={`${p}-notes`} label="Internal notes" hint="Only staff see this." className="sm:col-span-2"><Textarea id={`${p}-notes`} name="notes" rows={4} defaultValue={v.notes} maxLength={4000} /></Field>
        </div>
      </details>
    </div>
  );
}

export function CreateClientForm() {
  const [state, action, pending] = useActionState(createClient, initial);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="space-y-5">
      <ClientFields p="new" v={EMPTY_PROFILE} />
      <div className="space-y-2">
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

export function EditClientForm({ clientId, initial: v }: { clientId: string; initial: ClientProfile }) {
  const [state, action, pending] = useActionState(updateClient.bind(null, clientId), initial);
  return (
    <form action={action} className="space-y-5">
      <ClientFields p="edit" v={v} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save details</Button>
        <Msg s={state} />
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
      <div className="sm:col-span-2"><Label htmlFor="a-monitor">Monitor website (optional)</Label><Input id="a-monitor" name="monitorUrl" className="mt-1.5" placeholder="example.com" /></div>
      <p className="self-end text-xs text-muted-foreground sm:col-span-4">An expiry date sends the client renewal notices at 30 and 7 days and on expiry. A monitored website emails you when it goes down.</p>
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
