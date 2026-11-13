import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { fmtDate } from "@/lib/portal";
import { Badge } from "@/components/ui/badge";
import { CreateClientForm } from "@/components/admin/client-forms";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  await guardArea("orders");
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tickets: { where: { status: { not: "RESOLVED" } } }, assets: true } } },
  });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground">People who can sign in to the client portal.</p>
      </div>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">Add a client</h2>
        <CreateClientForm />
      </section>
      {clients.length === 0 ? (
        <p className="text-muted-foreground">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="p-3 font-medium">Client</th><th className="p-3 font-medium">Open tickets</th><th className="p-3 font-medium">Items</th><th className="p-3 font-medium">Last sign-in</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="p-3"><Link href={`/admin/clients/${c.id}`} className="font-medium hover:underline">{c.company || c.name}</Link><div className="text-xs text-muted-foreground">{c.name} · {c.email}</div></td>
                  <td className="p-3">{c._count.tickets}</td>
                  <td className="p-3">{c._count.assets}</td>
                  <td className="p-3 text-muted-foreground">{c.lastLoginAt ? fmtDate(c.lastLoginAt) : "Not yet"}</td>
                  <td className="p-3">{c.disabledAt && <Badge variant="outline">Disabled</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
