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

const NONE = "__none__";

export function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: { id: string; name: string }[];
  defaultValue?: string | null;
}) {
  const [value, setValue] = React.useState(defaultValue || NONE);

  return (
    <div>
      <Label htmlFor="field-categoryId">Category</Label>
      <input type="hidden" name="categoryId" value={value === NONE ? "" : value} />
      <Select value={value} onValueChange={(v) => setValue(v ?? NONE)}>
        <SelectTrigger id="field-categoryId" className="mt-1.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No category</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
