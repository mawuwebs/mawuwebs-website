import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { confirmSubscription } from "@/lib/actions/newsletter";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false } };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = await confirmSubscription(token ?? "");
  return (
    <>
      <PageHeader
        title={ok ? "You're subscribed" : "That link didn't work"}
        description={
          ok
            ? "Thanks for confirming. You'll get new articles by email, now and then."
            : "The confirmation link is invalid or has expired. Try subscribing again from the footer."
        }
      />
      <Section>
        <Link href="/blog" className="font-medium text-accent underline underline-offset-4">
          Read the latest articles
        </Link>
      </Section>
    </>
  );
}
