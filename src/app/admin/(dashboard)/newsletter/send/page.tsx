import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewsletterSendForm } from "@/components/admin/newsletter-send-form";
import { prisma } from "@/lib/prisma";
import { mailConfigured } from "@/lib/mail";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Send newsletter" };

export default async function SendNewsletterPage() {
  await requireAdmin();
  const count = await prisma.newsletterSubscriber.count({
    where: { confirmedAt: { not: null }, token: { not: null } },
  });
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/newsletter" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Subscribers
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Send newsletter</h1>
        <p className="mt-1 text-muted-foreground">Goes to confirmed subscribers only.</p>
      </div>
      <NewsletterSendForm count={count} mailReady={mailConfigured()} />
    </div>
  );
}
