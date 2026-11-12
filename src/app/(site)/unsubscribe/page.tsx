import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { unsubscribe } from "@/lib/actions/newsletter";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// Unsubscribing needs a deliberate click (POST) so email scanners that prefetch
// links can't silently remove people.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;

  async function confirm(formData: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    await unsubscribe(String(formData.get("token") ?? ""));
    redirect("/unsubscribe?done=1");
  }

  return (
    <>
      <PageHeader
        title={done ? "You're unsubscribed" : "Unsubscribe from our emails?"}
        description={
          done
            ? "Your email has been removed. You won't hear from us again."
            : "Click the button to stop receiving articles by email."
        }
      />
      <Section>
        {done ? (
          <Link href="/" className="font-medium text-accent underline underline-offset-4">
            Back to the site
          </Link>
        ) : token ? (
          <form action={confirm}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="lg">Yes, unsubscribe me</Button>
          </form>
        ) : (
          <p className="text-muted-foreground">This unsubscribe link is missing its token.</p>
        )}
      </Section>
    </>
  );
}
