"use client";

import * as React from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { restoreRevision } from "@/lib/actions/lifecycle";

export function RestoreRevisionButton({ revisionId, when }: { revisionId: string; when: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <History className="size-4" />
        Restore
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore the version from {when}?</AlertDialogTitle>
          <AlertDialogDescription>
            The current version is saved to this history first, so you can switch back. Unsaved edits in the form
            will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await restoreRevision(revisionId);
                if (r.success) {
                  toast.success(r.message);
                  setOpen(false);
                  router.refresh();
                } else toast.error(r.message);
              });
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Restore this version
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
