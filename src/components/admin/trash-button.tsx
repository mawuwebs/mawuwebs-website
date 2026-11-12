"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Action = () => Promise<{ success: boolean; message: string }>;

/** Soft delete with an immediate Undo toast. No confirm dialog: it is reversible. */
export function TrashButton({
  itemLabel,
  trash,
  restore,
}: {
  itemLabel: string;
  trash: Action;
  restore: Action;
}) {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await trash();
      if (!r.success) return void toast.error(r.message);
      toast.success(r.message, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: async () => {
            const back = await restore();
            if (back.success) toast.success(back.message);
            else toast.error(back.message);
          },
        },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={handleClick}
      aria-label={`Move ${itemLabel} to trash`}
      className="text-destructive hover:text-destructive"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
