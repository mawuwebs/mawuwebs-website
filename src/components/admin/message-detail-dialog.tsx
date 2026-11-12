"use client";

import * as React from "react";
import { format } from "date-fns";
import { Reply } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageStatusSelect } from "@/components/admin/message-status-select";
import { DeleteButton } from "@/components/admin/delete-button";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { deleteSubmission, setSubmissionStatus, saveSubmissionNotes } from "@/lib/actions/messages";
import { parseSubmission, submissionKind, KIND_LABEL } from "@/lib/submission";
import type { ContactSubmissionModel } from "@/generated/prisma/models";

export function MessageDetailDialog({ submission }: { submission: ContactSubmissionModel }) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState(submission.notes);
  const [saving, startSaving] = React.useTransition();
  const parsed = parseSubmission(submission.message);
  const kind = submissionKind(submission.subject);

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
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        View
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{KIND_LABEL[kind]}{kind === "message" && submission.subject ? `: ${submission.subject}` : ""}</DialogTitle>
          <DialogDescription>
            From {submission.name} &middot; {format(submission.createdAt, "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{submission.email}</dd>
            </div>
            {submission.phone && (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{submission.phone}</dd>
              </div>
            )}
          </dl>

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
                })
              }
            >
              Save notes
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <MessageStatusSelect id={submission.id} status={submission.status} />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={
                  <a
                    href={`mailto:${submission.email}?subject=${encodeURIComponent(
                      "Re: " + (submission.subject || "Your message to us")
                    )}`}
                  />
                }
              >
                <Reply className="size-4" />
                Reply
              </Button>
              <DeleteButton
                itemLabel={`message from ${submission.name}`}
                action={deleteSubmission.bind(null, submission.id)}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
