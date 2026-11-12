"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LogOut, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { PointerGlow } from "@/components/site/pointer-glow";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOutAction } from "@/lib/actions/auth";

export function AdminShell({
  siteName,
  user,
  children,
}: {
  siteName: string;
  user: { name?: string | null; email?: string | null; role: "ADMIN" | "EDITOR" };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh bg-secondary/30">
      <PointerGlow />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-forest py-6 lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-6 font-display text-lg font-bold text-white">
          <span className="flex size-8 items-center justify-center rounded-md bg-orange text-sm font-bold text-forest transition-transform duration-300 hover:rotate-6 hover:scale-110">
            {siteName.charAt(0)}
          </span>
          {siteName}
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto">
          <AdminNav role={user.role} />
        </div>
        <div className="mt-6 px-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/65 hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="size-4" />
            View site
          </Link>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-forest p-0 text-white">
          <SheetHeader>
            <SheetTitle className="text-white">{siteName}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 overflow-y-auto pb-6">
            <AdminNav role={user.role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="gap-2 px-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </span>
                    <span className="hidden text-sm font-medium sm:inline">
                      {user.name ?? user.email}
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <form action={signOutAction} className="w-full">
                      <button type="submit" className="flex w-full items-center gap-2">
                        <LogOut className="size-4" />
                        Sign out
                      </button>
                    </form>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="animate-in fade-in slide-in-from-bottom-2 flex-1 p-4 duration-500 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
