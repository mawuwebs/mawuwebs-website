"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_NAMES, getIcon } from "@/components/site/icon-map";

export function IconPicker({ defaultValue = "Sparkles" }: { defaultValue?: string }) {
  const [icon, setIcon] = React.useState(defaultValue);
  const Preview = getIcon(icon);

  return (
    <div>
      <Label htmlFor="field-icon">Icon</Label>
      <input type="hidden" name="icon" value={icon} />
      <div className="mt-1.5 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {/* Looked up from a static icon registry, not created dynamically. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Preview className="size-5" />
        </span>
        <Select value={icon} onValueChange={(v) => setIcon(v ?? defaultValue)}>
          <SelectTrigger id="field-icon" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
