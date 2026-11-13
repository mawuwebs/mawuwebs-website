"use client";

import { Download, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function PrintButton({ pdfHref }: { pdfHref?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pdfHref && (
        <a href={pdfHref} className={buttonVariants({ size: "sm" })}>
          <Download className="size-4" /> Download PDF
        </a>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Print
      </Button>
    </div>
  );
}
