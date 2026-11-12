import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/site/container";
import { TrackOnMount } from "@/components/site/track-on-mount";
import { ClearBriefDraft } from "@/components/site/clear-brief-draft";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Brief received", robots: { index: false } };

export default function ThanksPage() {
  return (
    <Container className="py-24 sm:py-32">
      <TrackOnMount event="brief_submitted" />
      <ClearBriefDraft />
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Brief received. Thank you.
        </h1>
        <p className="mt-4 text-muted-foreground">
          We read every brief. You&apos;ll hear back from a person within one business day, usually with a
          few questions or a suggested next step. Check your spam folder if you don&apos;t see us.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button render={<Link href="/portfolio" />}>See our work while you wait</Button>
          <Button render={<Link href="/resources/website-launch-checklist" />} variant="outline">
            Free launch checklist
          </Button>
        </div>
      </div>
    </Container>
  );
}
