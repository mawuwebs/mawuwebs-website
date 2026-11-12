"use client";

import { useEffect } from "react";

function channelOf(href: string): "phone" | "whatsapp" | "email" | null {
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return "whatsapp";
  return null;
}

/**
 * One listener for the whole site: any tap on a phone, WhatsApp or email link is counted in the
 * admin dashboard. Uses sendBeacon so it never delays opening the call or chat.
 */
export function ContactTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (window.location.pathname.startsWith("/preview")) return; // admins previewing aren't visitors
      const channel = channelOf(a.getAttribute("href") ?? "");
      if (!channel) return;
      const body = JSON.stringify({ channel, page: window.location.pathname });
      try {
        if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
          fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
        }
      } catch {
        /* tracking must never get in the way */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
