"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setSubmissionStatus, type SubmissionStatusValue } from "@/lib/actions/messages";
import { STATUS_OPTIONS } from "@/lib/submission";
import { cn } from "@/lib/utils";

export function MessageStatusSelect({
  id,
  status,
}: {
  id: string;
  status: SubmissionStatusValue;
}) {
  const [value, setValue] = React.useState(status);
  const [pending, startTransition] = React.useTransition();
  const current = STATUS_OPTIONS.find((o) => o.value === value);

  function handleChange(next: string | null) {
    if (!next) return;
    const typed = next as SubmissionStatusValue;
    setValue(typed);
    startTransition(async () => {
      const result = await setSubmissionStatus(id, typed);
      if (result.success) toast.success(result.message);
    });
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger size="sm" disabled={pending} className={cn("w-32 border", current?.style)}>
        <SelectValue>{current?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
