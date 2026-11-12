import Image from "next/image";
import { Container } from "@/components/site/container";
import type { TrustLogo } from "@/lib/settings";

/** Renders nothing until real logos are added in Admin > Settings > Hero. */
export function TrustStrip({ logos }: { logos: TrustLogo[] }) {
  if (logos.length === 0) return null;
  return (
    <section aria-label="Clients and partners" className="border-b border-border bg-secondary/40">
      <Container className="py-8">
        <p className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Trusted by and working with
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((l, i) => (
            <li key={`${l.name}-${i}`} className="flex h-10 items-center">
              {l.image ? (
                <Image
                  src={l.image}
                  alt={l.name}
                  width={140}
                  height={40}
                  className="h-9 w-auto max-w-[9rem] object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              ) : (
                <span className="font-display text-lg font-semibold text-muted-foreground">{l.name}</span>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
