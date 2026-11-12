"use client";

import * as React from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RestoreButton({
  itemLabel,
  action,
}: {
  itemLabel: string;
  action: () => Promise<{ success: boolean; message: string }>;
}) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Restore ${itemLabel}`}
      onClick={() =>
        startTransition(async () => {
          const r = await action();
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
      Restore
    </Button>
  );
}
