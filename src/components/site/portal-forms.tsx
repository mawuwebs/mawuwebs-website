"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTicket, replyToTicket, type PortalState } from "@/lib/actions/portal";

const initial: PortalState = { success: false, message: "" };

export function NewTicketForm() {
  const [state, action, pending] = useActionState(createTicket, initial);
  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <Label htmlFor="subject">What do you need help with?</Label>
        <Input id="subject" name="subject" required maxLength={140} className="mt-1.5" placeholder="e.g. Printer in accounts not working" />
      </div>
      <div>
        <Label htmlFor="body">Details</Label>
        <Textarea id="body" name="body" rows={6} required className="mt-1.5" placeholder="What happened, who is affected, and any error messages." />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="urgent" className="size-4" />
        This is stopping people from working
      </label>
      {state.message && !state.success && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} Send request
      </Button>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(replyToTicket.bind(null, ticketId), initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Label htmlFor="body">Add a message</Label>
      <Textarea id="body" name="body" rows={4} required />
      {state.message && !state.success && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} Send
      </Button>
    </form>
  );
}
