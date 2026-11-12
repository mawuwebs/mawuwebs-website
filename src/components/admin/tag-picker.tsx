"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function TagPicker({
  name = "tagIds",
  tags,
  defaultSelected = [],
}: {
  name?: string;
  tags: { id: string; name: string }[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = React.useState<string[]>(defaultSelected);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((t) => t !== id)));
  }

  return (
    <div>
      <Label>Tags</Label>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {tags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(tag.id)}
              onCheckedChange={(checked) => toggle(tag.id, checked === true)}
            />
            {tag.name}
          </label>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tags yet. Create some in Categories &amp; Tags.
          </p>
        )}
      </div>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
