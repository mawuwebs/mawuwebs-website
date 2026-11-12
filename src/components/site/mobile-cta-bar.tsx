"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_ON = ["/start-a-project", "/estimate", "/contact"];

/** Sticky "Start a Project" bar on small screens. Shows after the hero, hides near the footer. */
export function MobileCtaBar() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        document.documentElement.scrollHeight - (y + window.innerHeight) < 480;
      setVisible(y > 600 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <Link
        href="/start-a-project"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange text-base font-semibold text-forest shadow-md"
      >
        Start a Project
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
