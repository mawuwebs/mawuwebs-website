"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

/** Fires a Plausible event once when the page mounts. */
export function TrackOnMount({ event }: { event: string }) {
  React.useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
