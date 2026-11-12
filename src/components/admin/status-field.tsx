"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StatusField({
  defaultValue = "DRAFT",
}: {
  defaultValue?: "DRAFT" | "PUBLISHED";
}) {
  const [status, setStatus] = React.useState(defaultValue);
  return (
    <div>
      <Label htmlFor="field-status">Status</Label>
      <input type="hidden" name="status" value={status} />
      <Select
        value={status}
        onValueChange={(v) => setStatus((v as "DRAFT" | "PUBLISHED") ?? defaultValue)}
      >
        <SelectTrigger id="field-status" className="mt-1.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function SwitchField({
  name,
  label,
  description,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
      <div>
        <Label htmlFor={`field-${name}`}>{label}</Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Switch id={`field-${name}`} checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}
