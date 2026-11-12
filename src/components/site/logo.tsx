import { cn } from "@/lib/utils";

export function Logo({
  className,
  height = 44,
  name,
  nameClassName,
  accentClassName = "text-accent",
}: {
  className?: string;
  height?: number;
  /** Site name rendered as live text beside the portrait. */
  name?: string;
  nameClassName?: string;
  /** Colour for the last word of the name. */
  accentClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/portrait-mark.webp"
        alt=""
        aria-hidden="true"
        width={height}
        height={height}
        className="brand-logo shrink-0 object-contain"
        style={{ height, width: height }}
      />
      {name ? (
        <span
          className={cn(
            "font-[family-name:var(--font-logo)] text-xl font-bold tracking-tight leading-none",
            nameClassName
          )}
        >
          {name.split(" ").slice(0, -1).join(" ")}{" "}
          <span className={accentClassName}>{name.split(" ").slice(-1)}</span>
        </span>
      ) : null}
    </span>
  );
}
