import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifyProgressToken } from "@/lib/unsubscribe";
import { ProgressOptOut } from "@/components/portal/progress-optout";

export const metadata: Metadata = { title: "Progress emails", robots: { index: false, follow: false } };

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u = "", t = "" } = await searchParams;
  const valid = verifyProgressToken(u, t);
  const user = valid ? await prisma.user.findFirst({ where: { id: u, role: "CLIENT" }, select: { progressEmails: true } }) : null;
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Project progress emails</h1>
      <div className="mt-6">
        {user ? <ProgressOptOut userId={u} token={t} initialOn={user.progressEmails} /> : <p className="text-muted-foreground">This link is not valid. Use the link in the latest progress email, or sign in to your portal to see where your projects stand.</p>}
      </div>
    </main>
  );
}
