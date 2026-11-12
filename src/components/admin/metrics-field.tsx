"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Metric } from "@/lib/settings";

export function MetricsField({
  defaultValue = [],
  fieldPrefix = "metric",
  label = "Key metrics",
  hint = "Shown on your homepage, e.g. “120+ Projects Delivered”.",
  placeholderValue = "120+",
  placeholderLabel = "Projects Delivered",
}: {
  defaultValue?: Metric[];
  fieldPrefix?: string;
  label?: string;
  hint?: string;
  placeholderValue?: string;
  placeholderLabel?: string;
}) {
  const [metrics, setMetrics] = React.useState<Metric[]>(
    defaultValue.length > 0 ? defaultValue : [{ label: "", value: "" }]
  );

  function update(index: number, field: keyof Metric, value: string) {
    setMetrics((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        {hint}
      </p>
      <div className="mt-3 space-y-2">
        {metrics.map((metric, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              name={`${fieldPrefix}Value`}
              value={metric.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder={placeholderValue}
              className="w-24"
            />
            <Input
              name={`${fieldPrefix}Label`}
              value={metric.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder={placeholderLabel}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMetrics((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove metric"
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
        onClick={() => setMetrics((prev) => [...prev, { label: "", value: "" }])}
      >
        <Plus className="size-4" />
        Add metric
      </Button>
    </div>
  );
}
