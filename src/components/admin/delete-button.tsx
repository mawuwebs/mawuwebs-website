"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export function DeleteButton({
  action,
  itemLabel,
  size = "icon-sm",
  variant = "ghost",
}: {
  action: () => Promise<{ success: boolean; message: string }>;
  itemLabel: string;
  size?: "icon-sm" | "sm" | "default";
  variant?: "ghost" | "outline" | "destructive";
}) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={`Delete ${itemLabel}`}
            className={variant === "ghost" ? "text-destructive hover:text-destructive" : ""}
          />
        }
      >
        <Trash2 className="size-4" />
        {size !== "icon-sm" && "Delete"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete &ldquo;{itemLabel}
            &rdquo;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
