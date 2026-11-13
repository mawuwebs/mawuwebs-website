"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LogOut, ExternalLink, User, ShieldCheck } from "lucide-react";
import type { Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Logo } from "@/components/site/logo";
import { PointerGlow } from "@/components/site/pointer-glow";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrdersLive } from "@/components/admin/orders-live";
import { CommandPalette } from "@/components/admin/command-palette";
import { signOutAction } from "@/lib/actions/auth";

export function AdminShell({
  siteName,
  user,
  badges,
  children,
}: {
  siteName: string;
  user: { name?: string | null; email?: string | null; image?: string | null; role: Role };
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh bg-secondary/30">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <PointerGlow />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-forest py-6 lg:flex">
        <Link href="/admin" className="px-6" aria-label={`${siteName} admin home`}>
          <Logo height={48} name={siteName} nameClassName="text-lg text-white" accentClassName="text-[#f5a623]" />
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto">
          <AdminNav role={user.role} badges={badges} />
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
            <SheetTitle className="text-white">
              <Logo height={40} name={siteName} nameClassName="text-base text-white" accentClassName="text-[#f5a623]" />
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 overflow-y-auto pb-6">
            <AdminNav role={user.role} badges={badges} onNavigate={() => setMobileOpen(false)} />
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
          <div className="ml-auto mr-2 sm:mr-4">
            <CommandPalette role={user.role} />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar size="default">
                      {user.image && <AvatarImage src={user.image} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name ? user.name.trim()[0]?.toUpperCase() : <User className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
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
                <DropdownMenuItem render={<Link href="/admin/account" className="flex w-full items-center gap-2" />}>
                  <ShieldCheck className="size-4" />
                  Account &amp; security
                </DropdownMenuItem>
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

        <main id="admin-main" className="animate-in fade-in slide-in-from-bottom-2 flex-1 p-4 duration-500 sm:p-6 lg:p-8">{children}</main>
        <OrdersLive initial={badges?.["/admin/messages:orders"] ?? 0} />
      </div>
    </div>
  );
}
