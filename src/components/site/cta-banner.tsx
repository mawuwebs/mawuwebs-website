import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";

export function CtaBanner({
  title = "Ready to build something great?",
  description = "Tell us about your project and we'll get back to you within one business day.",
  ctaText = "Start a Project",
  ctaUrl = "/start-a-project",
}: {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-orange">
      <div aria-hidden className="animate-float pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-yellow/40 blur-3xl" />
      <div aria-hidden className="animate-float-slow pointer-events-none absolute -right-20 -bottom-28 size-80 rounded-full bg-forest/15 blur-3xl" />
      <Container className="relative flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-balance text-forest sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-forest/80 text-pretty">{description}</p>
        <Button
          render={<Link href={ctaUrl} />}
          size="lg"
          className="sheen-host h-12 bg-forest px-8 text-base text-white shadow-lg shadow-forest/25 hover:-translate-y-0.5 hover:bg-forest-dark hover:shadow-xl"
        >
          {ctaText}
          <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-1" />
        </Button>
        <Link href="/estimate" className="inline-block py-2.5 text-sm font-medium text-forest underline underline-offset-4">
          Or get a rough estimate first
        </Link>
      </Container>
    </section>
  );
}
