import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { BookingForm } from "@/components/site/booking-form";
import { TOPICS } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Book a free IT consultation",
  description: "Request a free 30-minute call about your IT. Tell us when suits you and we will confirm a time within one business day.",
};

export default async function BookACallPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const defaultTopic = TOPICS.find((t) => t === topic);
  return (
    <>
      <PageHeader
        eyebrow="Free consultation"
        title="Book a free 30-minute call"
        description="Tell us what suits you. We confirm a time within one business day. No obligation, no jargon."
      />
      <Section>
        <BookingForm defaultTopic={defaultTopic} />
      </Section>
    </>
  );
}
