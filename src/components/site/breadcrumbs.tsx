import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ldJson } from "@/lib/sanitize";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({
  items,
  variant = "dark",
  className,
}: {
  items: BreadcrumbItem[];
  variant?: "dark" | "light";
  className?: string;
}) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={item.label} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-3.5",
                    variant === "dark" ? "text-white/40" : "text-muted-foreground/60"
                  )}
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "transition-colors",
                    variant === "dark"
                      ? "text-white/70 hover:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "font-medium",
                    variant === "dark" ? "text-white" : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
