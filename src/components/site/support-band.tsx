import Link from "next/link";
import { ArrowRight, Headset, MessageCircle } from "lucide-react";
import { Container } from "@/components/site/container";
import { whatsappHref } from "@/components/site/quick-contact";

export function SupportBand({
  whatsapp,
  promise,
}: {
  whatsapp?: string | null;
  promise?: string | null;
}) {
  return (
    <section className="border-y border-border bg-secondary/50">
      <Container className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Headset className="size-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">Something broken? We can help today.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {promise ?? "Tell us what's wrong and a technician will get back to you."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/support"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            Get IT support <ArrowRight className="size-4" />
          </Link>
          {whatsapp && (
            <a
              href={whatsappHref(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold hover:border-foreground/30"
            >
              <MessageCircle className="size-4 text-success" /> WhatsApp us
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}
