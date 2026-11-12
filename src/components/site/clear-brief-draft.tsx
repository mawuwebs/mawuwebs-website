"use client";

import * as React from "react";
import { BRIEF_DRAFT_KEY } from "@/components/site/project-brief-form";

/** Once the brief is sent, the saved draft is no longer needed. */
export function ClearBriefDraft() {
  React.useEffect(() => {
    try {
      sessionStorage.removeItem(BRIEF_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
