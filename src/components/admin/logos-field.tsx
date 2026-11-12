"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import type { TrustLogo } from "@/lib/settings";

export function LogosField({ defaultValue = [] }: { defaultValue?: TrustLogo[] }) {
  const [rows, setRows] = React.useState<(TrustLogo & { key: number })[]>(
    defaultValue.map((r, i) => ({ ...r, key: i }))
  );
  const nextKey = React.useRef(defaultValue.length);

  return (
    <div>
      <Label>Trusted by / partners</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Real client or vendor logos only (e.g. brands you partner with or clients who agreed to be
        shown). Shown as a strip on the homepage. Leave empty to hide it.
      </p>
      <div className="mt-3 space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start gap-3 rounded-xl border border-border p-4">
            <div className="flex-1 space-y-3">
              <Input
                name="trustLogoName"
                defaultValue={row.name}
                placeholder="Name, e.g. Acme Ltd"
                aria-label="Logo name"
              />
              <ImageUploadField label="Logo image" name="trustLogoImage" defaultValue={row.image} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove logo"
              onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setRows((r) => [...r, { key: nextKey.current++, name: "", image: "" }])}
      >
        <Plus className="size-4" />
        Add logo
      </Button>
    </div>
  );
}
