import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";
import { buttonVariants } from "@/components/ui/button";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePortalUser()]);
  const doc = await prisma.clientDocument.findFirst({ where: { id, userId: user.id } });
  if (!doc) notFound();
  return (
    <div className="max-w-2xl">
      <Link href="/portal/documents" className="text-sm text-muted-foreground hover:text-foreground">← All documents</Link>
      <h1 className="mt-3 font-display text-3xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{doc.kind} · {fmtDate(doc.createdAt)}</p>
      {doc.body && <pre className="mt-8 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{doc.body}</pre>}
      {doc.url && (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={`${buttonVariants()} mt-8`}>Open file</a>
      )}
    </div>
  );
}
