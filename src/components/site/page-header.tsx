import { Container } from "@/components/site/container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/site/breadcrumbs";
import { renderEmphasis } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  illustration,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  illustration?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden border-b border-border bg-forest text-white", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(245,166,35,0.28), transparent 45%), radial-gradient(circle at 85% 0%, rgba(250,242,160,0.14), transparent 40%)",
        }}
      />
      <div aria-hidden className="bg-grid-fade pointer-events-none absolute inset-0" />
      <Container
        className={cn(
          "relative grid grid-cols-1 items-center gap-10 py-20 sm:py-24",
          illustration && "lg:grid-cols-[1.1fr_0.9fr] lg:gap-14"
        )}
      >
        <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} variant="dark" className="mb-5" />
          )}
          {eyebrow && (
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-yellow uppercase">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {renderEmphasis(title)}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-lg text-white/75 text-pretty">
              {description}
            </p>
          )}
        </div>
        {illustration && (
          <div className="animate-in fade-in zoom-in-95 fill-mode-both relative mx-auto aspect-[4/3] delay-150 duration-700 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:max-w-none">
            {illustration}
          </div>
        )}
      </Container>
    </div>
  );
}
