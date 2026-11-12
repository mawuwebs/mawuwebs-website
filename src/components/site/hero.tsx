import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { StatCountUp } from "@/components/site/stat-count-up";
import { Illustration } from "@/components/site/illustrations";
import { renderEmphasis } from "@/lib/emphasis";

export function Hero({
  headline,
  subheading,
  ctaPrimaryText,
  ctaPrimaryUrl,
  ctaSecondaryText,
  ctaSecondaryUrl,
}: {
  headline: string;
  subheading: string;
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  ctaSecondaryText: string;
  ctaSecondaryUrl: string;
}) {
  return (
    <div className="relative overflow-hidden bg-forest text-white">
      <div
        aria-hidden
        className="animate-hero-drift pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 10%, rgba(245,166,35,0.28), transparent 45%), radial-gradient(circle at 90% 20%, rgba(250,242,160,0.14), transparent 40%), radial-gradient(circle at 50% 100%, rgba(28,43,107,0.9), transparent 60%)",
        }}
      />
      <div aria-hidden className="bg-grid-fade pointer-events-none absolute inset-0" />
      <Container className="relative grid grid-cols-1 items-center gap-10 py-14 sm:gap-12 sm:py-28 lg:grid-cols-2 lg:py-32">
        <div>
          <span className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-yellow uppercase duration-500">
            <span className="relative flex size-2 text-orange"><span className="pulse-dot absolute inset-0" /><span className="relative size-2 rounded-full bg-orange" /></span>
            IT &amp; Digital Solutions
          </span>
          <h1 className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-6 font-display text-[2.1rem] leading-[1.12] font-bold tracking-tight text-balance duration-700 delay-100 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            {renderEmphasis(headline)}
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-5 max-w-xl text-base text-white/80 sm:mt-6 sm:text-lg text-pretty duration-700 delay-200">
            {subheading}
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-9 flex flex-col gap-3 duration-700 delay-300 sm:flex-row">
            <Button
              render={<Link href={ctaPrimaryUrl} />}
              size="lg"
              className="sheen-host h-12 bg-orange px-7 text-base text-forest shadow-lg shadow-orange/20 hover:-translate-y-0.5 hover:bg-orange-dark hover:shadow-xl hover:shadow-orange/30"
            >
              {ctaPrimaryText}
              <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-1" />
            </Button>
            <Button
              render={<Link href={ctaSecondaryUrl} />}
              size="lg"
              variant="outline"
              className="h-12 border-white/40 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"
            >
              {ctaSecondaryText}
            </Button>
          </div>

          <ul className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80 sm:mt-10 duration-700 delay-500">
            {["Fixed-scope delivery", "Senior engineers only", "Post-launch support"].map(
              (item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-yellow" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 fill-mode-both relative duration-1000 delay-200">
          <div className="animate-float relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40">
            <Illustration variant="dashboard" className="h-full w-full" />
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both animate-float-slow absolute -bottom-6 -left-6 hidden rounded-2xl border border-white/10 bg-white/95 p-4 shadow-xl backdrop-blur duration-500 delay-700 sm:block">
            <p className="font-display text-2xl font-bold text-forest">
              <StatCountUp value="120+" />
            </p>
            <p className="text-xs text-forest/70">Projects delivered</p>
          </div>
        </div>
      </Container>
    </div>
  );
}
