"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NewsletterForm } from "@/components/site/newsletter-form";

const KEY = "mw-prompt-dismissed";
const HIDE_ON = ["/contact", "/estimate", "/privacy-policy", "/terms-of-service"];

/** Quiet newsletter card. Shows once per session after the reader is ~60% down a content page. */
export function ScrollPrompt() {
  const pathname = usePathname();
  const [shownFor, setShownFor] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const show = shownFor === pathname && !dismissed;

  React.useEffect(() => {
    if (HIDE_ON.includes(pathname) || pathname === "/") return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* storage unavailable: still allow the prompt */
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 600 && window.scrollY / max > 0.6) {
        setShownFor(pathname);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;
  return (
    <aside
      aria-label="Newsletter"
      className="animate-in fade-in slide-in-from-bottom-4 fixed right-4 bottom-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl duration-500"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <p className="pr-6 font-display text-lg font-semibold">Enjoying this?</p>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        New articles by email, now and then. Unsubscribe whenever.
      </p>
      <NewsletterForm />
    </aside>
  );
}
