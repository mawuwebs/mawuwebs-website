"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { NAV_LINKS } from "@/components/site/nav-links";
import { SearchDialog } from "@/components/site/search-dialog";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

export function Navbar({
  siteName,
  logo,
}: {
  siteName: string;
  logo?: string | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "border-border bg-background/90 backdrop-blur-md"
          : "border-transparent bg-background/60 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 w-full sm:h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center" aria-label={siteName}>
          {logo ? (
            <Image
              src={logo}
              alt={siteName}
              width={140}
              height={32}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <Logo height={64} name={siteName} nameClassName="hidden text-foreground lg:inline" />
          )}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group/link relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-accent",
                  active ? "text-accent" : "text-foreground/80"
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-accent transition-transform duration-300 ease-out",
                    active ? "scale-x-100" : "scale-x-0 group-hover/link:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/portal/login" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent">
            Client login
          </Link>
          <SearchDialog />
          <ThemeToggle />
          <Button render={<Link href="/start-a-project" />} size="lg">
            Start a Project
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <SearchDialog />
          <ThemeToggle />
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="size-10" aria-label="Open menu" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{siteName}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {NAV_LINKS.map((link, i) => (
                  <SheetClose
                    key={link.href}
                    render={
                      <Link
                        href={link.href}
                        style={{ animationDelay: `${80 + i * 50}ms` }}
                        className={cn(
                          "animate-in fade-in slide-in-from-right-4 fill-mode-both rounded-md px-3 py-3 text-base font-medium duration-500 hover:bg-muted",
                          (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)) &&
                            "bg-accent/10 text-accent"
                        )}
                        aria-current={
                          (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))
                            ? "page"
                            : undefined
                        }
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
                <SheetClose
                  render={
                    <Link
                      href="/portal/login"
                      className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
                    />
                  }
                >
                  Client login
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/start-a-project"
                      className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full justify-center")}
                    />
                  }
                >
                  Start a Project
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
