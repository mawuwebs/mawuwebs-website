"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/status-badge";

export function PublishToggle({
  status,
  action,
}: {
  status: "DRAFT" | "PUBLISHED";
  action: () => Promise<{ success: boolean; message: string }>;
}) {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 disabled:opacity-60"
      aria-label={status === "PUBLISHED" ? "Unpublish" : "Publish"}
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      <StatusBadge status={status} />
    </button>
  );
}
