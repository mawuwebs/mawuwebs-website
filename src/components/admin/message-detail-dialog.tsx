"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2, Mail, Phone, Reply, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageStatusSelect } from "@/components/admin/message-status-select";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  deleteSubmission,
  replyToSubmission,
  saveSubmissionNotes,
  saveSubmissionPipeline,
  setSubmissionStatus,
} from "@/lib/actions/messages";
import { parseSubmission, kindOf, KIND_LABEL } from "@/lib/submission";
import type { ContactSubmissionModel } from "@/generated/prisma/models";

const toDateInput = (d: Date | null) => (d ? format(d, "yyyy-MM-dd") : "");

export function MessageDetailDialog({
  submission,
  canDelete,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: {
  submission: ContactSubmissionModel;
  canDelete: boolean;
  defaultOpen?: boolean;
  /** Optional controlled state so the table row can open the dialog. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  React.useEffect(() => {
    if (defaultOpen && submission.status === "NEW") setSubmissionStatus(submission.id, "READ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [notes, setNotes] = React.useState(submission.notes);
  const [quote, setQuote] = React.useState(submission.quoteAmount?.toString() ?? "");
  const [followUp, setFollowUp] = React.useState(toDateInput(submission.followUpAt));
  const [replying, setReplying] = React.useState(false);
  const [subject, setSubject] = React.useState(
    "Re: " + (submission.subject || "Your message to us")
  );
  const [body, setBody] = React.useState(`Hi ${submission.name.split(" ")[0]},\n\n\n\nBest regards`);
  const [saving, startSaving] = React.useTransition();
  const [sending, startSending] = React.useTransition();
  const [savingPipe, startSavingPipe] = React.useTransition();

  const parsed = parseSubmission(submission.message);
  const kind = kindOf(submission);
  const pipelineDirty =
    quote !== (submission.quoteAmount?.toString() ?? "") || followUp !== toDateInput(submission.followUpAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && submission.status === "NEW") {
          setSubmissionStatus(submission.id, "READ");
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>View</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {KIND_LABEL[kind]}
            {kind === "message" && submission.subject ? `: ${submission.subject}` : ""}
          </DialogTitle>
          <DialogDescription>
            From {submission.name} &middot; {format(submission.createdAt, "MMM d, yyyy 'at' h:mm a")}
            {submission.repliedAt && <> &middot; replied {format(submission.repliedAt, "MMM d")}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <MessageStatusSelect id={submission.id} status={submission.status} />
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <a
              href={`mailto:${submission.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:bg-secondary"
            >
              <Mail className="size-3.5" />
              {submission.email}
            </a>
            {submission.phone && (
              <a
                href={`tel:${submission.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:bg-secondary"
              >
                <Phone className="size-3.5" />
                {submission.phone}
              </a>
            )}
          </div>

          {parsed.structured ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-secondary/50 p-4 text-sm">
                {parsed.fields.map((f) => (
                  <div key={f.key} className={f.value.length > 40 ? "col-span-2" : ""}>
                    <dt className="text-muted-foreground">{f.key}</dt>
                    <dd className="font-medium">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {parsed.body && (
                <div className="rounded-lg border border-border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {parsed.body}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-secondary/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {submission.message}
            </div>
          )}

          {/* Pipeline */}
          <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium">Pipeline</legend>
            <div>
              <label htmlFor={`quote-${submission.id}`} className="text-xs text-muted-foreground">
                Quote value (USD)
              </label>
              <Input
                id={`quote-${submission.id}`}
                inputMode="numeric"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="e.g. 2500"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor={`follow-${submission.id}`} className="text-xs text-muted-foreground">
                Follow up on
              </label>
              <Input
                id={`follow-${submission.id}`}
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingPipe || !pipelineDirty}
                onClick={() =>
                  startSavingPipe(async () => {
                    const r = await saveSubmissionPipeline(submission.id, { quoteAmount: quote, followUpAt: followUp });
                    if (r.success) toast.success(r.message);
                    else toast.error(r.message);
                  })
                }
              >
                Save pipeline
              </Button>
            </div>
          </fieldset>

          {/* Reply */}
          {replying ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Reply to {submission.email}</p>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} aria-label="Message" />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={sending}
                  onClick={() =>
                    startSending(async () => {
                      const r = await replyToSubmission(submission.id, { subject, body });
                      if (r.success) {
                        toast.success(r.message);
                        setReplying(false);
                      } else toast.error(r.message);
                    })
                  }
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={`mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    />
                  }
                >
                  Open in mail app
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sending marks this enquiry as replied and logs it in the notes.
              </p>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setReplying(true)}>
              <Reply className="size-4" />
              Reply by email
            </Button>
          )}

          <div>
            <label htmlFor={`notes-${submission.id}`} className="text-sm font-medium">
              Internal notes
            </label>
            <Textarea
              id={`notes-${submission.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Call notes, quote sent, next step. Only visible here."
              className="mt-1.5"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={saving || notes === submission.notes}
              onClick={() =>
                startSaving(async () => {
                  const r = await saveSubmissionNotes(submission.id, notes);
                  if (r.success) toast.success(r.message);
                  else toast.error(r.message);
                })
              }
            >
              Save notes
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {canDelete && (
              <DeleteButton
                itemLabel={`message from ${submission.name}`}
                action={deleteSubmission.bind(null, submission.id)}
                variant="outline"
                size="sm"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
