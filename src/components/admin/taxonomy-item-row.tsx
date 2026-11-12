"use client";

import * as React from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";

export function TaxonomyItemRow({
  id,
  name,
  meta,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  meta?: string;
  onRename: (id: string, name: string) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; message: string }>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [pending, startTransition] = React.useTransition();

  function save() {
    if (value.trim() === name || value.trim().length < 2) {
      setEditing(false);
      setValue(name);
      return;
    }
    startTransition(async () => {
      const result = await onRename(id, value.trim());
      if (result.success) {
        toast.success(result.message);
        setEditing(false);
      } else {
        toast.error(result.message);
        setValue(name);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setEditing(false);
                setValue(name);
              }
            }}
            className="h-8"
          />
          <Button type="button" size="icon-sm" variant="ghost" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setValue(name);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{name}</span>
            {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Rename ${name}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <DeleteButton itemLabel={name} action={onDelete.bind(null, id)} />
          </div>
        </>
      )}
    </div>
  );
}
