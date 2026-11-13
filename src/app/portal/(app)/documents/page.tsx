import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";

export default async function DocumentsPage() {
  const user = await requirePortalUser();
  const docs = await prisma.clientDocument.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Documents</h1>
      <p className="mt-1 text-muted-foreground">Monthly reports, invoices and agreements.</p>
      {docs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nothing shared yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/portal/documents/${d.id}`} className="flex items-baseline justify-between gap-4 py-4 hover:bg-secondary/60 sm:px-2">
                <span className="font-medium">{d.title}</span>
                <span className="text-sm capitalize text-muted-foreground">{d.kind} · {fmtDate(d.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
