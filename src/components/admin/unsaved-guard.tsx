"use client";

import * as React from "react";

/**
 * Drop inside a <form>. Warns before the tab is closed or reloaded once any field changed,
 * and stands down when the form is submitted.
 */
export function UnsavedGuard() {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
        window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  return <span ref={ref} hidden />;
}
