"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Hit = { title: string; href: string; sub: string; group: string };

const SHORTCUTS: Hit[] = [
  { title: "Estimate my project", href: "/estimate", sub: "Four questions, rough scope", group: "Quick links" },
  { title: "Website launch checklist", href: "/resources/website-launch-checklist", sub: "Free, interactive", group: "Quick links" },
  { title: "Portfolio", href: "/portfolio", sub: "Selected work", group: "Quick links" },
  { title: "Contact", href: "/contact", sub: "Start a conversation", group: "Quick links" },
];

export function SearchDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [result, setResult] = React.useState<{ q: string; hits: Hit[] }>({ q: "", hits: [] });
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const d = await res.json();
        setResult({ q, hits: [
          ...d.services.map((s: { title: string; slug: string; description: string }) => ({
            title: s.title, href: `/services/${s.slug}`, sub: s.description, group: "Services",
          })),
          ...d.projects.map((s: { title: string; slug: string; description: string }) => ({
            title: s.title, href: `/portfolio/${s.slug}`, sub: s.description, group: "Work",
          })),
          ...d.posts.map((s: { title: string; slug: string; excerpt: string }) => ({
            title: s.title, href: `/blog/${s.slug}`, sub: s.excerpt, group: "Journal",
          })),
        ] });
        setActive(0);
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const searching = q.trim().length >= 2;
  const hits = searching && result.q === q ? result.hits : [];
  const list = searching ? hits : SHORTCUTS;

  function go(h: Hit) {
    setOpen(false);
    setQ("");
    router.push(h.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && list[active]) {
      go(list[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className={cn(
          "inline-flex h-10 min-w-10 items-center justify-center gap-2 sm:h-9 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <Search className="size-4" />
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-sans text-[11px] xl:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search services, work and articles"
              aria-label="Search"
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {list.map((h, i) => (
              <li key={h.href + i}>
                <Link
                  href={h.href}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5",
                    i === active && "bg-secondary"
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium">{h.title}</span>
                    <span className="text-xs text-muted-foreground">{h.group}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">{h.sub}</span>
                </Link>
              </li>
            ))}
            {searching && result.q === q && hits.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing found for &ldquo;{q}&rdquo;.
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
