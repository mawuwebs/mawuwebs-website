"use client";

import { useEffect, useRef, useState } from "react";

export function StatCountUp({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : value;
  const [count, setCount] = useState(match ? 0 : target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!match || !el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const run = () => {
      const duration = reduced ? 0 : 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(Math.round(eased * target));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    // Start only once the number is actually on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {count}
      {suffix}
    </span>
  );
}
