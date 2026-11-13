import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { CtaBanner } from "@/components/site/cta-banner";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { live } from "@/lib/content";
import { INDUSTRIES, getIndustry } from "@/lib/industries";

export const dynamicParams = false;
export const generateStaticParams = () => INDUSTRIES.map((i) => ({ industry: i.slug }));

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const ind = getIndustry((await params).industry);
  if (!ind) return {};
  return { title: `IT support for ${ind.name}`, description: ind.intro };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const ind = getIndustry((await params).industry);
  if (!ind) notFound();
  const services = await prisma.service.findMany({ where: { ...live(), slug: { in: ind.services } }, select: { slug: true, title: true, description: true } });
  return (
    <>
      <PageHeader
        eyebrow={`IT for ${ind.name}`}
        title={ind.headline}
        description={ind.intro}
        breadcrumbs={[{ label: "Services", href: "/services" }, { label: ind.name }]}
      />
      <Section>
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {ind.pains.map((p) => (
            <div key={p.title}>
              <h2 className="font-display text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        {services.length > 0 && (
          <>
            <h2 className="mt-16 font-display text-2xl font-semibold">How we help</h2>
            <ul className="mt-4 border-b border-border">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="group flex items-baseline justify-between gap-4 border-t border-border py-5 hover:bg-secondary/60 sm:px-2">
                    <span>
                      <span className="font-display text-lg font-semibold">{s.title}</span>
                      <span className="mt-1 block max-w-xl text-sm text-muted-foreground">{s.description}</span>
                    </span>
                    <ArrowUpRight className="size-5 shrink-0 text-muted-foreground group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-10 max-w-2xl text-sm text-muted-foreground">{ind.note}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/it-health-check" className={buttonVariants()}>Take the free IT health check</Link>
          <Link href="/book-a-call" className={buttonVariants({ variant: "outline" })}>Book a free call</Link>
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}
