"use client";

import { useEffect } from "react";

/** One delegated listener feeding --mx/--my to any `.spotlight` element. */
export function PointerGlow() {
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spotlight");
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${e.clientX - r.left}px`);
        target.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
