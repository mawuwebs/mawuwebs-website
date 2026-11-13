"use client";

import * as React from "react";
import { Check, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ToolkitActions({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: ignore */
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy text"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  );
}
