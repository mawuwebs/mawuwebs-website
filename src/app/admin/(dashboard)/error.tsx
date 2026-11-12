"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <h1 className="font-display text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page couldn&apos;t load. Your data is safe. Try again, and if it keeps happening check the server log.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
