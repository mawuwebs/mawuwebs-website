"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealState = "idle" | "hidden" | "visible";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("idle");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.92;
    if (alreadyVisible) {
      setState("visible");
      return;
    }

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={state === "visible" && delay ? { animationDelay: `${Math.min(delay, 240)}ms` } : undefined}
      className={cn(
        state === "hidden" && "reveal-hidden opacity-0",
        state === "visible" &&
          "animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700",
        className
      )}
    >
      {children}
    </div>
  );
}
