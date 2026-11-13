"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NAV_SECTIONS } from "@/components/admin/nav-config";
import { can, type Area, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Command = { id: string; label: string; hint: string; href: string; create?: boolean; area?: Area };

const CREATE: Command[] = [
  { id: "c-post", label: "New blog post", hint: "Create", href: "/admin/posts/new", create: true, area: "content" },
  { id: "c-project", label: "New project", hint: "Create", href: "/admin/projects/new", create: true, area: "content" },
  { id: "c-service", label: "New service", hint: "Create", href: "/admin/services/new", create: true, area: "content" },
  { id: "c-plan", label: "New plan", hint: "Create", href: "/admin/plans/new", create: true, area: "content" },
  { id: "c-page", label: "New page", hint: "Create", href: "/admin/pages/new", create: true, area: "content" },
  { id: "c-testimonial", label: "New testimonial", hint: "Create", href: "/admin/testimonials/new", create: true, area: "content" },
  { id: "c-faq", label: "New FAQ", hint: "Create", href: "/admin/faqs/new", create: true, area: "content" },
  { id: "c-newsletter", label: "Send a newsletter", hint: "Create", href: "/admin/newsletter/send", create: true, area: "newsletter" },
];

/** ⌘K / Ctrl+K quick jump: pages, create actions, or search enquiries by typing a name or email. */
export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);

  const commands = React.useMemo<Command[]>(() => {
    const nav = NAV_SECTIONS.flatMap((s) =>
      s.items
        .filter((i) => (!i.adminOnly || role === "ADMIN") && (!i.area || can(role, i.area)))
        .map((i) => ({ id: i.href, label: i.label, hint: s.title, href: i.href }))
    );
    return [...nav, { id: "account", label: "Account & security", hint: "You", href: "/admin/account" }, ...CREATE.filter((c) => !c.area || can(role, c.area))];
  }, [role]);

  const term = q.trim().toLowerCase();
  const results = React.useMemo(() => {
    const matched = term
      ? commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(term))
      : commands;
    return term
      ? [
          ...matched,
          { id: "search", label: `Search orders for “${q.trim()}”`, hint: "Search", href: `/admin/messages?q=${encodeURIComponent(q.trim())}` },
        ]
      : matched;
  }, [commands, term, q]);

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

  function go(c: Command | undefined) {
    if (!c) return;
    setOpen(false);
    router.push(c.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground sm:flex"
        aria-label="Open quick search"
      >
        <Search className="size-4" />
        <span>Search or jump to…</span>
        <kbd className="ml-6 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary sm:hidden"
        aria-label="Open quick search"
      >
        <Search className="size-5" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setQ("");
            setActive(0);
          }
        }}
      >
        <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Quick search</DialogTitle>
          <DialogDescription className="sr-only">Type to filter pages and actions. Use arrow keys and Enter.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(results[active]);
                }
              }}
              placeholder="Type a page, action, or an enquirer's name…"
              aria-label="Search"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === active ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  {c.create ? <Plus className="size-4 text-accent" /> : <span className="size-4" />}
                  <span className="flex-1">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.hint}</span>
                  {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
