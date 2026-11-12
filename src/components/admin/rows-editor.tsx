"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type Col<T> = {
  key: keyof T & string;
  label: string;
  type: "text" | "number" | "check" | "area";
  className?: string;
  placeholder?: string;
  /** Lets the owner lock a field per row, e.g. "no limit" on the last tier. */
  disabled?: (row: T, index: number, rows: T[]) => boolean;
};

/**
 * Editable list: add, remove and reorder rows, each with a few fields.
 * Pure controlled component. The parent owns the array and decides how to save it.
 */
export function RowsEditor<T extends Record<string, unknown>>({
  rows,
  onChange,
  cols,
  blank,
  addLabel = "Add",
  minRows = 0,
  readOnlyId,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  cols: Col<T>[];
  blank: () => T;
  addLabel?: string;
  minRows?: number;
  /** Shows a row's internal id as small muted text. */
  readOnlyId?: keyof T & string;
}) {
  const set = (i: number, patch: Partial<T>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-end gap-3">
              {cols.map((c) => {
                const id = `rows-${c.key}-${i}-${cols.length}`;
                const disabled = c.disabled?.(row, i, rows) ?? false;
                const value = row[c.key];
                return (
                  <div key={c.key} className={cn("min-w-[8rem] flex-1", c.className)}>
                    <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
                      {c.label}
                    </label>
                    {c.type === "area" ? (
                      <Textarea id={id} rows={2} value={String(value ?? "")} placeholder={c.placeholder} onChange={(e) => set(i, { [c.key]: e.target.value } as Partial<T>)} />
                    ) : c.type === "check" ? (
                      <Switch id={id} checked={Boolean(value)} onCheckedChange={(v) => set(i, { [c.key]: v } as Partial<T>)} />
                    ) : (
                      <Input
                        id={id}
                        type={c.type === "number" ? "number" : "text"}
                        min={c.type === "number" ? 0 : undefined}
                        value={value === null || value === undefined ? "" : String(value)}
                        placeholder={c.placeholder}
                        disabled={disabled}
                        onChange={(e) =>
                          set(i, { [c.key]: c.type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value } as Partial<T>)
                        }
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  disabled={rows.length <= minRows}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {readOnlyId && row[readOnlyId] ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Internal id: <code>{String(row[readOnlyId])}</code> (kept stable so past enquiries still read correctly)
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, blank()])}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}
