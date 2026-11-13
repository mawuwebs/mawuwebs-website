"use client";

import * as React from "react";
import { addDays, format, formatDistanceToNowStrict } from "date-fns";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  Reply,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  deleteSubmission,
  replyToSubmission,
  saveLostReason,
  saveSubmissionNotes,
  saveSubmissionPipeline,
  setSubmissionStatus,
  type SubmissionStatusValue,
} from "@/lib/actions/messages";
import {
  parseSubmission,
  kindOf,
  isUrgent,
  KIND_LABEL,
  LOST_REASONS,
  STATUS_OPTIONS,
} from "@/lib/submission";
import { convertSubmissionToClient } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";
import type { ContactSubmissionModel } from "@/generated/prisma/models";

const toDateInput = (d: Date | null) => (d ? format(d, "yyyy-MM-dd") : "");

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </h3>
);

type NavProps = { onPrev?: () => void; onNext?: () => void; position?: string };

/** Fold server-side changes (e.g. a reply log line) into a local draft without losing what the user typed. */
function mergeServerText(
  local: string,
  prevServer: string,
  nextServer: string,
) {
  if (local === prevServer) return nextServer;
  if (local.startsWith(prevServer))
    return nextServer + local.slice(prevServer.length);
  return local;
}

const REPLY_LOG =
  /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] Replied by (.+?): (.+)$/gm;

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return (
    !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
  );
}

/**
 * One dialog for the whole table: content swaps when stepping between enquiries, so the overlay
 * never flickers. Closing or stepping away with unsaved edits asks first.
 */
export function MessageDetailDialog({
  submission,
  canDelete,
  open,
  onOpenChange,
  onPrev,
  onNext,
  position,
}: {
  submission: ContactSubmissionModel;
  canDelete: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & NavProps) {
  const dirtyRef = React.useRef(false);
  const [pending, setPending] = React.useState<(() => void) | null>(null);

  const guard = React.useCallback((action: () => void) => {
    if (dirtyRef.current) setPending(() => action);
    else action();
  }, []);

  // Opening an unread enquiry (click, deep link or prev/next) marks it read.
  React.useEffect(() => {
    if (open && submission.status === "NEW")
      setSubmissionStatus(submission.id, "READ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submission.id]);

  const guardedPrev = onPrev ? () => guard(onPrev) : undefined;
  const guardedNext = onNext ? () => guard(onNext) : undefined;

  // j/k and arrow keys step through the list when no field has focus.
  const keyRef = React.useRef({ prev: guardedPrev, next: guardedNext });
  React.useEffect(() => {
    keyRef.current = { prev: guardedPrev, next: guardedNext };
  });
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "ArrowRight") keyRef.current.next?.();
      else if (e.key === "k" || e.key === "ArrowLeft") keyRef.current.prev?.();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) =>
          next ? onOpenChange(true) : guard(() => onOpenChange(false))
        }
      >
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DetailBody
            key={submission.id}
            submission={submission}
            canDelete={canDelete}
            dirtyRef={dirtyRef}
            onPrev={guardedPrev}
            onNext={guardedNext}
            position={position}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits on this enquiry that haven&apos;t been saved or
              sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                dirtyRef.current = false;
                pending?.();
                setPending(null);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailBody({
  submission,
  canDelete,
  dirtyRef,
  onPrev,
  onNext,
  position,
}: {
  submission: ContactSubmissionModel;
  canDelete: boolean;
  dirtyRef: React.RefObject<boolean>;
} & NavProps) {
  const [status, setStatus] = React.useState<SubmissionStatusValue>(
    submission.status,
  );
  const [seenStatus, setSeenStatus] = React.useState(submission.status);
  if (seenStatus !== submission.status) {
    // Server value changed (e.g. auto-marked read): adopt it during render.
    setSeenStatus(submission.status);
    setStatus(submission.status);
  }

  const first = submission.name.trim().split(" ")[0] || "there";
  const serverQuote = submission.quoteAmount?.toString() ?? "";
  const serverFollow = toDateInput(submission.followUpAt);
  const [notes, setNotes] = React.useState(submission.notes);
  const [quote, setQuote] = React.useState(serverQuote);
  const [followUp, setFollowUp] = React.useState(serverFollow);
  const [seen, setSeen] = React.useState({
    notes: submission.notes,
    quote: serverQuote,
    follow: serverFollow,
  });
  if (
    seen.notes !== submission.notes ||
    seen.quote !== serverQuote ||
    seen.follow !== serverFollow
  ) {
    setNotes((n) => mergeServerText(n, seen.notes, submission.notes));
    setQuote((v) => (v === seen.quote ? serverQuote : v));
    setFollowUp((v) => (v === seen.follow ? serverFollow : v));
    setSeen({
      notes: submission.notes,
      quote: serverQuote,
      follow: serverFollow,
    });
  }
  const [replying, setReplying] = React.useState(false);
  const [subject, setSubject] = React.useState(
    "Re: " + (submission.subject || "Your message to us"),
  );
  const initialBody = `Hi ${first},\n\n\n\nBest regards`;
  const [body, setBody] = React.useState(initialBody);
  const [lostReason, setLostReason] = React.useState(submission.lostReason);
  const [copied, setCopied] = React.useState(false);
  const [saving, startSaving] = React.useTransition();
  const [sending, startSending] = React.useTransition();
  const [savingPipe, startSavingPipe] = React.useTransition();

  const parsed = parseSubmission(submission.message);
  const kind = kindOf(submission);
  const urgent = isUrgent(submission);
  const pipelineDirty = quote !== serverQuote || followUp !== serverFollow;
  const notesDirty = notes !== submission.notes;
  const dirty =
    pipelineDirty || notesDirty || (replying && body !== initialBody);
  React.useEffect(() => {
    dirtyRef.current = dirty;
    return () => {
      dirtyRef.current = false;
    };
  }, [dirty, dirtyRef]);

  const replies = [...submission.notes.matchAll(REPLY_LOG)].map((m) => ({
    at: m[1],
    by: m[2],
    subject: m[3],
  }));
  const waDigits = submission.phone?.replace(/\D/g, "") ?? "";

  const TEMPLATES = [
    {
      label: "Acknowledge",
      text: `Hi ${first},\n\nThanks for getting in touch. I've read your message and will come back to you within one working day.\n\nBest regards`,
    },
    {
      label: "Send quote",
      text: `Hi ${first},\n\nThanks for the details. Here is my quote for the work:\n\n- Scope: \n- Price: \n- Timeline: \n\nHappy to talk it through on a quick call.\n\nBest regards`,
    },
    {
      label: "Book a call",
      text: `Hi ${first},\n\nThanks for reaching out. Could we have a short call to go over this? I'm free on:\n\n- \n- \n\nLet me know what works for you.\n\nBest regards`,
    },
  ];

  function changeStatus(next: SubmissionStatusValue) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setSubmissionStatus(submission.id, next).then((r) => {
      if (r.success) toast.success(r.message);
      else {
        setStatus(prev);
        toast.error(r.message);
      }
    });
  }

  function sendReply() {
    startSending(async () => {
      const r = await replyToSubmission(submission.id, { subject, body });
      if (r.success) {
        toast.success(r.message);
        setReplying(false);
        setBody(initialBody);
      } else toast.error(r.message);
    });
  }

  function pickLostReason(r: string) {
    const next = lostReason === r ? "" : r;
    const prev = lostReason;
    setLostReason(next);
    saveLostReason(submission.id, next).then((res) => {
      if (!res.success) {
        setLostReason(prev);
        toast.error(res.message);
      }
    });
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(submission.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <>
      {/* Header: who, what, and where it stands */}
      <DialogHeader className="gap-0 space-y-4 border-b border-border px-6 pt-6 pb-4 pr-14">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-lg font-bold text-accent"
          >
            {submission.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate font-display text-xl font-bold leading-tight">
              {submission.name}
            </DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground/80">
                {KIND_LABEL[kind]}
              </span>
              {urgent && (
                <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  Urgent: work stopped
                </span>
              )}
              <time
                title={format(submission.createdAt, "MMM d, yyyy 'at' h:mm a")}
              >
                {formatDistanceToNowStrict(submission.createdAt, {
                  addSuffix: true,
                })}
              </time>
              {submission.repliedAt && (
                <span>
                  &middot; replied {format(submission.repliedAt, "MMM d")}
                </span>
              )}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<a href={`mailto:${submission.email}`} />}
          >
            <Mail className="size-4" />
            <span className="max-w-[14rem] truncate">{submission.email}</span>
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Copy email"
            onClick={copyEmail}
          >
            {copied ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          {submission.phone && (
            <Button
              size="sm"
              variant="outline"
              render={<a href={`tel:${submission.phone}`} />}
            >
              <Phone className="size-4" />
              {submission.phone}
            </Button>
          )}
          {waDigits.length >= 7 && (
            <Button
              size="sm"
              variant="outline"
              render={
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </Button>
          )}
        </div>

        {/* One-click pipeline */}
        <div
          role="radiogroup"
          aria-label="Status"
          className="flex flex-wrap gap-1.5 rounded-xl bg-secondary/60 p-1"
        >
          {STATUS_OPTIONS.map((o) => {
            const active = status === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeStatus(o.value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  active
                    ? cn("shadow-sm", o.style)
                    : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </DialogHeader>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
        <section className="space-y-3">
          <SectionTitle>
            {kind === "message" && submission.subject
              ? submission.subject
              : "Request"}
          </SectionTitle>
          {parsed.structured ? (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {parsed.fields.map((f) => (
                  <div
                    key={f.key}
                    className={
                      f.value.length > 28 ? "col-span-2 sm:col-span-3" : ""
                    }
                  >
                    <dt className="text-xs text-muted-foreground">{f.key}</dt>
                    <dd className="mt-0.5 text-sm font-medium break-words">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {parsed.body && (
                <p className="rounded-xl bg-secondary/50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {parsed.body}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-xl bg-secondary/50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {submission.message}
            </p>
          )}
        </section>

        {status === "LOST" && (
          <section className="space-y-3">
            <SectionTitle>Why was it lost?</SectionTitle>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Lost reason"
            >
              {LOST_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={lostReason === r}
                  onClick={() => pickLostReason(r)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    lostReason === r
                      ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionTitle>Quote &amp; follow-up</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`quote-${submission.id}`}
                className="text-sm font-medium"
              >
                Quote value
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id={`quote-${submission.id}`}
                  inputMode="numeric"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="2500"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`follow-${submission.id}`}
                className="text-sm font-medium"
              >
                Follow up on
              </label>
              <Input
                id={`follow-${submission.id}`}
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: "Tomorrow", days: 1 },
                  { label: "3 days", days: 3 },
                  { label: "Next week", days: 7 },
                ].map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() =>
                      setFollowUp(
                        format(addDays(new Date(), c.days), "yyyy-MM-dd"),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <CalendarClock className="size-3" />
                    {c.label}
                  </button>
                ))}
                {followUp && (
                  <button
                    type="button"
                    onClick={() => setFollowUp("")}
                    className="px-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          {pipelineDirty && (
            <Button
              type="button"
              size="sm"
              disabled={savingPipe}
              onClick={() =>
                startSavingPipe(async () => {
                  const r = await saveSubmissionPipeline(submission.id, {
                    quoteAmount: quote,
                    followUpAt: followUp,
                  });
                  if (r.success) toast.success(r.message);
                  else toast.error(r.message);
                })
              }
            >
              {savingPipe && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          )}
        </section>

        <ClientSection submission={submission} />

        <section className="space-y-3">
          <SectionTitle>Activity</SectionTitle>
          <ol className="space-y-2 border-l border-border pl-4 text-sm">
            <li className="relative">
              <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-muted-foreground/40" />
              Received{" "}
              <span className="text-muted-foreground">
                &middot; {format(submission.createdAt, "MMM d, h:mm a")}
              </span>
            </li>
            {replies.map((r, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-success" />
                Replied by {r.by}: &ldquo;{r.subject}&rdquo;{" "}
                <span className="text-muted-foreground">&middot; {r.at}</span>
              </li>
            ))}
            {submission.followUpAt && (
              <li className="relative">
                <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-accent" />
                Follow-up set{" "}
                <span className="text-muted-foreground">
                  &middot; {format(submission.followUpAt, "MMM d")}
                </span>
              </li>
            )}
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <NotebookPen className="size-3.5" />
              Private notes
            </span>
          </SectionTitle>
          <Textarea
            id={`notes-${submission.id}`}
            aria-label="Internal notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Call notes, quote sent, next step. Only visible here."
          />
          {notesDirty && (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() =>
                startSaving(async () => {
                  const r = await saveSubmissionNotes(submission.id, notes);
                  if (r.success) toast.success(r.message);
                  else toast.error(r.message);
                })
              }
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save notes
            </Button>
          )}
        </section>
      </div>

      {/* Docked footer: composer when replying, otherwise primary actions */}
      <div className="border-t border-border bg-card">
        {replying ? (
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted-foreground">
                Start from
              </span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setBody(t.text)}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs transition-colors hover:border-foreground/30"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Subject"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !sending) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              rows={7}
              aria-label="Message"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" disabled={sending} onClick={sendReply}>
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send to {first}{" "}
                <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1 text-[10px] sm:inline">
                  ⌘↵
                </kbd>
              </Button>
              <Button
                type="button"
                variant="outline"
                render={
                  <a
                    href={`mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  />
                }
              >
                Open in mail app
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="ml-auto"
                onClick={() => setReplying(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Previous enquiry"
                disabled={!onPrev}
                onClick={onPrev}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Next enquiry"
                disabled={!onNext}
                onClick={onNext}
              >
                <ChevronRight className="size-4" />
              </Button>
              {position && (
                <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">
                  {position} &middot; press J / K to move
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {canDelete && (
                <DeleteButton
                  itemLabel={`enquiry from ${submission.name}`}
                  action={deleteSubmission.bind(null, submission.id)}
                  variant="ghost"
                  size="icon-sm"
                />
              )}
              <Button type="button" onClick={() => setReplying(true)}>
                <Reply className="size-4" />
                Reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Link an enquiry to a client record, then jump to quoting or the client page. */
function ClientSection({ submission }: { submission: ContactSubmissionModel }) {
  const [clientId, setClientId] = React.useState<string | null>(submission.clientId);
  const [seen, setSeen] = React.useState(submission.clientId);
  const [pending, start] = React.useTransition();
  if (seen !== submission.clientId) {
    setSeen(submission.clientId);
    setClientId(submission.clientId);
  }
  return (
    <section className="space-y-3">
      <SectionTitle>Client</SectionTitle>
      {clientId ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/clients/${clientId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Open client</Link>
          <Link href={`/admin/billing/quotes/new?enquiry=${submission.id}`} className={buttonVariants({ size: "sm" })}>Create quote</Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Make {submission.name} a client to quote, invoice and track projects. They get a portal invite by email.</p>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await convertSubmissionToClient(submission.id);
                if (r.success) {
                  toast.success(r.message);
                  setClientId(r.clientId ?? null);
                } else toast.error(r.message);
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Convert to client
          </Button>
        </div>
      )}
    </section>
  );
}
