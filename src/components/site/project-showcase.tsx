"use client";

import { useState } from "react";
import Image from "next/image";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hero preview with a desktop / mobile switch (mobile only when a phone screenshot exists). */
export function ProjectShowcase({
  title,
  desktop,
  mobile,
  url,
}: {
  title: string;
  desktop: string;
  mobile?: string;
  url?: string | null;
}) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const host = url?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div>
      {mobile && (
        <div className="mb-4 flex justify-center">
          <div role="group" aria-label="Preview device" className="inline-flex rounded-full border border-border bg-secondary/60 p-1">
            {(
              [
                ["desktop", "Desktop", Monitor],
                ["mobile", "Mobile", Smartphone],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
                  view === key ? "bg-forest text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "desktop" || !mobile ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-forest/10">
          <div className="flex items-center gap-1.5 border-b border-border bg-secondary/70 px-4 py-3" aria-hidden>
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            {host && <span className="ml-3 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">{host}</span>}
          </div>
          <div className="relative aspect-[16/10] w-full">
            <Image src={desktop} alt={`${title} desktop preview`} fill priority sizes="(min-width: 1280px) 1152px, 100vw" className="object-cover object-top" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center rounded-2xl bg-forest px-4 py-10">
          <div className="relative aspect-[9/16] w-full max-w-[17rem] overflow-hidden rounded-[2rem] border-[6px] border-white/15 bg-black shadow-2xl">
            <Image src={mobile} alt={`${title} mobile preview`} fill sizes="272px" className="object-cover object-top" />
          </div>
        </div>
      )}
    </div>
  );
}
