import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { editorOptions } from "@/lib/billing-queries";
import { DocumentEditor } from "@/components/admin/document-editor";

export const metadata: Metadata = { title: "New quote" };

export default async function NewQuote({ searchParams }: { searchParams: Promise<{ client?: string; enquiry?: string }> }) {
  await guardArea("billing");
  const sp = await searchParams;
  const [{ clients, projects }, enquiry] = await Promise.all([
    editorOptions(),
    sp.enquiry ? prisma.contactSubmission.findUnique({ where: { id: sp.enquiry }, select: { id: true, clientId: true, subject: true, name: true } }) : null,
  ]);
  const clientId = sp.client ?? enquiry?.clientId ?? "";
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">New quote</h1>
        {enquiry && !enquiry.clientId && <p className="mt-1 text-sm text-destructive">Convert {enquiry.name} to a client from the enquiry first, then come back.</p>}
      </div>
      <DocumentEditor
        kind="quote" id={null} clients={clients} projects={projects} submissionId={enquiry?.id}
        initial={{ clientId: clients.some((c) => c.id === clientId) ? clientId : "", projectId: "", title: enquiry?.subject ?? "", currency: "GHS", taxPercent: "", notes: "", date: "", items: [{ description: "", quantity: "1", unit: "" }] }}
      />
    </div>
  );
}
