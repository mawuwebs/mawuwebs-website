import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getIcon } from "@/components/site/icon-map";
import { cn } from "@/lib/utils";

export function ServiceCard({
  title,
  slug,
  description,
  icon,
  className,
}: {
  title: string;
  slug: string;
  description: string;
  icon?: string | null;
  className?: string;
}) {
  const Icon = getIcon(icon);
  return (
    <Link
      href={`/services/${slug}`}
      className={cn(
        "group spotlight relative flex flex-col rounded-2xl border border-border bg-card p-7 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-accent group-hover:text-accent-foreground duration-300">
        {/* Looked up from a static icon registry, not created dynamically. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon className="size-6" />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        Learn more
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" />
      </span>
    </Link>
  );
}
