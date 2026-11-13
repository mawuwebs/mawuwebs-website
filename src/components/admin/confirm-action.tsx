"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

/** A button that asks before running a server action, then toasts the result. */
export function ConfirmAction({
  label,
  icon,
  title,
  description,
  confirmLabel,
  action,
  destructive = false,
  variant = "outline",
  onDone,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  action: () => Promise<{ success: boolean; message: string }>;
  destructive?: boolean;
  variant?: "outline" | "ghost" | "destructive";
  onDone?: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const res = await action();
      if (res.success) {
        toast.success(res.message);
        setOpen(false);
        onDone?.();
      } else {
        toast.error(res.message);
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
            className={cn(destructive && variant !== "destructive" && "text-destructive hover:text-destructive", className)}
          />
        }
      >
        {icon}
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              run();
            }}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
