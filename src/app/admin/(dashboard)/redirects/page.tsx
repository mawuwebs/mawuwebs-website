import type { Metadata } from "next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { RedirectForm } from "@/components/admin/redirect-form";
import { prisma } from "@/lib/prisma";
import { deleteRedirect } from "@/lib/actions/redirects";

export const metadata: Metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  const redirects = await prisma.redirect.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Redirects"
        description="Send old URLs to new ones so links and rankings are not lost. Changing a slug adds one automatically."
      />
      <RedirectForm />
      {redirects.length === 0 ? (
        <EmptyState message="No redirects yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Old URL</TableHead>
                <TableHead>New URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {redirects.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.fromPath}</TableCell>
                  <TableCell className="font-mono text-sm">{r.toPath}</TableCell>
                  <TableCell className="space-x-1">
                    <Badge variant="secondary">{r.permanent ? "301" : "302"}</Badge>
                    {r.auto && <Badge variant="outline">auto</Badge>}
                  </TableCell>
                  <TableCell>
                    <DeleteButton action={deleteRedirect.bind(null, r.id)} itemLabel="redirect" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
