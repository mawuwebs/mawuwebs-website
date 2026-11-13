"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pinned to the bottom of the viewport so Save is always reachable on long forms. */
export function StickySaveBar({
  children,
  message,
  success,
  className,
}: {
  children: React.ReactNode;
  message?: string;
  success?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/90 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75",
        className
      )}
    >
      {children}
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={cn("flex items-center gap-2 text-sm", success ? "text-success" : "text-destructive")}
        >
          {success ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
