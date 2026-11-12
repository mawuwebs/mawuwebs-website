"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/components/admin/nav-config";
import { cn } from "@/lib/utils";

export function AdminNav({
  role,
  onNavigate,
}: {
  role: "ADMIN" | "EDITOR";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((i) => !i.adminOnly || role === "ADMIN");
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="px-3 text-xs font-semibold tracking-wider text-white/40 uppercase">
              {section.title}
            </p>
            <div className="mt-2 flex flex-col gap-0.5">
              {items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group/item relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-orange transition-all duration-300",
                        active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                      )}
                    />
                    <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
