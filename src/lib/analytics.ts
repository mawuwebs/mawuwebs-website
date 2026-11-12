// Thin wrapper over Plausible custom events. No-ops when the script isn't loaded.
export function track(event: string, props?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
  };
  w.plausible?.(event, props ? { props } : undefined);
}
