"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Loads the third-party map only when asked: faster page, and no Google requests until the visitor opts in. */
export function MapEmbed({ src, address }: { src: string; address?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {on ? (
        <iframe src={src} title="Office location map" className="h-96 w-full" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="flex h-96 flex-col items-center justify-center gap-3 bg-secondary/50 px-6 text-center">
          <MapPin className="size-8 text-muted-foreground" aria-hidden />
          {address && <p className="text-sm text-muted-foreground">{address}</p>}
          <Button type="button" variant="outline" onClick={() => setOn(true)}>Load map</Button>
          <p className="max-w-xs text-xs text-muted-foreground">Loading the map connects to Google Maps.</p>
        </div>
      )}
    </div>
  );
}
