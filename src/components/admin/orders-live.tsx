"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

const POLL_MS = 60_000;

/**
 * Keeps the admin honest without a reload: polls the order count, puts it in the tab title,
 * refreshes the page data when it changes, and (if allowed) raises a desktop notification
 * when a new order arrives.
 */
export function OrdersLive({ initial }: { initial: number }) {
  const router = useRouter();
  const last = React.useRef(initial);
  const baseTitle = React.useRef<string | null>(null);
  const [perm, setPerm] = React.useState<NotificationPermission | "unsupported">("unsupported");

  const setTitle = React.useCallback((n: number) => {
    if (baseTitle.current === null) baseTitle.current = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = n > 0 ? `(${n}) ${baseTitle.current}` : baseTitle.current;
  }, []);

  React.useEffect(() => {
    // Read after mount so the first render matches the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm("Notification" in window ? Notification.permission : "unsupported");
    setTitle(initial);
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data: { total: number; latest: { name: string } | null } = await res.json();
        setTitle(data.total);
        if (data.total !== last.current) {
          if (data.total > last.current && "Notification" in window && Notification.permission === "granted") {
            new Notification("New order waiting", {
              body: data.latest ? `From ${data.latest.name}` : `${data.total} waiting for a reply`,
            });
          }
          last.current = data.total;
          router.refresh();
        }
      } catch {
        /* offline: try again next tick */
      }
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial, router, setTitle]);

  if (perm !== "default") return null;
  return (
    <button
      type="button"
      onClick={async () => setPerm(await Notification.requestPermission())}
      className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg hover:bg-secondary"
    >
      <Bell className="size-4" aria-hidden /> Turn on desktop alerts for new orders
    </button>
  );
}
