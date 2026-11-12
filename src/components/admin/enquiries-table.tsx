"use client";

import * as React from "react";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MessageDetailDialog } from "@/components/admin/message-detail-dialog";
import { bulkDeleteSubmissions, bulkSetStatus, type SubmissionStatusValue } from "@/lib/actions/messages";
import { KIND_LABEL, STATUS_OPTIONS, formatMoney, isUrgent, kindOf, parseSubmission } from "@/lib/submission";
import { cn } from "@/lib/utils";
import type { ContactSubmissionModel } from "@/generated/prisma/models";

function preview(message: string) {
  const p = parseSubmission(message);
  const text = p.structured ? p.body || p.fields.map((f) => f.value).join(" · ") : message;
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

const BULK_STATUSES = STATUS_OPTIONS.filter((o) => o.value !== "NEW");

export function EnquiriesTable({
  rows,
  canDelete,
  openId,
}: {
  rows: ContactSubmissionModel[];
  canDelete: boolean;
  openId?: string;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [openRow, setOpenRow] = React.useState<string | null>(openId ?? null);

  // Selections for rows that left the page (filter, page change, delete) are ignored.
  const rowIds = new Set(rows.map((r) => r.id));
  const ids = [...selected].filter((id) => rowIds.has(id));

  const allSelected = rows.length > 0 && ids.length === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function run(fn: () => Promise<{ success: boolean; message: string }>, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        toast.success(r.message);
        setSelected(new Set());
        after?.();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-3">
      {ids.length > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm"
        >
          <span className="font-medium">{ids.length} selected</span>
          <span className="text-muted-foreground">Mark as</span>
          {BULK_STATUSES.map((o) => (
            <Button
              key={o.value}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => bulkSetStatus(ids, o.value as SubmissionStatusValue))}
            >
              {o.label}
            </Button>
          ))}
          {canDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>From</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const opt = STATUS_OPTIONS.find((o) => o.value === s.status);
              const kind = kindOf(s);
              const open = !["WON", "LOST"].includes(s.status);
              const overdue = open && s.followUpAt && isPast(s.followUpAt);
              return (
                <TableRow
                  key={s.id}
                  data-state={selected.has(s.id) ? "selected" : undefined}
                  className={cn("cursor-pointer", s.status === "NEW" && "bg-accent/5")}
                  onClick={() => setOpenRow(s.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                      aria-label={`Select ${s.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <p className={cn("flex items-center gap-1.5 font-medium", s.status === "NEW" && "font-semibold")}>
                      {s.status === "NEW" && (
                        <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                      )}
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    <p className="mt-0.5 line-clamp-1 max-w-[18rem] text-xs text-muted-foreground/80">{preview(s.message)}</p>
                    {isUrgent(s) && open && (
                      <span className="mt-1 inline-block rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        Urgent: work stopped
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {KIND_LABEL[kind]}
                    {kind === "message" && s.subject ? (
                      <span className="block max-w-[14rem] truncate text-xs">{s.subject}</span>
                    ) : null}
                    {s.notes && <span className="block text-xs text-accent">Has notes</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.quoteAmount != null && <span className="block font-medium">{formatMoney(s.quoteAmount)}</span>}
                    {s.followUpAt && open && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs",
                          overdue ? "font-medium text-destructive" : "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="size-3" />
                        {overdue ? "Overdue " : ""}
                        {format(s.followUpAt, "MMM d")}
                      </span>
                    )}
                    {s.quoteAmount == null && !(s.followUpAt && open) && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={format(s.createdAt, "MMM d, yyyy 'at' h:mm a")}>
                    {formatDistanceToNowStrict(s.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", opt?.style)}>
                      {opt?.label ?? s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <MessageDetailDialog
                      submission={s}
                      canDelete={canDelete}
                      defaultOpen={s.id === openId}
                      open={openRow === s.id}
                      onOpenChange={(v) => setOpenRow(v ? s.id : null)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {ids.length} enquir{ids.length === 1 ? "y" : "ies"}?
            </AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the selected enquiries and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                run(() => bulkDeleteSubmissions(ids), () => setConfirmDelete(false));
              }}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
