"use client";

import * as React from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const KEY = "mw-launch-checklist";

const SECTIONS = [
  {
    title: "Content",
    items: [
      "Every page has real copy, with no placeholder text left",
      "Each page has one clear next step (call, form, buy)",
      "Contact details are correct everywhere they appear",
      "Images have descriptive alt text",
      "Spelling and names checked by someone who didn't write them",
    ],
  },
  {
    title: "Design and usability",
    items: [
      "Checked on a real phone, not just a resized browser window",
      "Menu, forms and buttons work with a keyboard alone",
      "Text is readable: enough size and contrast",
      "Forms show clear errors and a clear confirmation",
      "A custom 404 page points people somewhere useful",
    ],
  },
  {
    title: "Speed",
    items: [
      "Images are sized and compressed for the web",
      "Home page loads in under about 3 seconds on mobile data",
      "No giant videos or fonts loading before the content",
      "Tested with PageSpeed Insights or Lighthouse",
    ],
  },
  {
    title: "Search and sharing",
    items: [
      "Every page has a unique title and description",
      "Sitemap and robots file are in place",
      "Social share preview looks right (title, image)",
      "Old URLs redirect to new ones if you're replacing a site",
      "Site is registered with Google Search Console",
    ],
  },
  {
    title: "Technical",
    items: [
      "HTTPS works and HTTP redirects to it",
      "Forms actually reach your inbox (send a test)",
      "Backups are set up and you know how to restore one",
      "Analytics is installed and counting",
      "Admin passwords are strong and unique",
    ],
  },
  {
    title: "Legal",
    items: [
      "Privacy policy covers the data you really collect",
      "Cookie notice added if you use tracking cookies",
      "Terms or returns policy added if you sell anything",
    ],
  },
];

const ALL = SECTIONS.flatMap((s) => s.items);

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("mw-checklist", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("mw-checklist", cb);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function LaunchChecklist() {
  // null on the server and first client render, so SSR markup matches.
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, () => null);
  const ready = raw !== null;
  const done = React.useMemo<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(raw ?? "[]"));
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  function persist(next: Set<string>) {
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("mw-checklist"));
  }

  function toggle(item: string) {
    const next = new Set(done);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    persist(next);
    if (next.size === ALL.length) track("checklist_completed");
  }

  const pct = Math.round((done.size / ALL.length) * 100);

  return (
    <div>
      <div className="sticky top-20 z-10 -mx-5 border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {ready ? done.size : 0} of {ALL.length} done
          </span>
          <button
            type="button"
            onClick={() => persist(new Set())}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={ready ? pct : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Checklist progress"
        >
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${ready ? pct : 0}%` }} />
        </div>
      </div>

      <div className="mt-10 space-y-12">
        {SECTIONS.map((section) => (
          <fieldset key={section.title}>
            <legend className="font-display text-2xl font-semibold">{section.title}</legend>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {section.items.map((item) => {
                const checked = ready && done.has(item);
                return (
                  <li key={item}>
                    <label className="flex cursor-pointer items-start gap-4 py-4">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        onChange={() => toggle(item)}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                          checked ? "border-accent bg-accent text-accent-foreground" : "border-foreground/30"
                        )}
                      >
                        {checked && <Check className="size-3.5" />}
                      </span>
                      <span className={cn(checked && "text-muted-foreground line-through")}>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
