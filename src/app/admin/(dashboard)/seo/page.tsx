import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { runSeoAudit } from "@/lib/seo-audit";

export const metadata: Metadata = { title: "SEO Audit" };
export const dynamic = "force-dynamic";

const SEV = { high: "destructive", medium: "secondary", low: "outline" } as const;

export default async function SeoAuditPage() {
  const rows = await runSeoAudit();
  const flagged = rows.filter((r) => r.issues.length > 0).sort((a, b) => {
    const score = (r: typeof a) => r.issues.reduce((n, i) => n + (i.severity === "high" ? 3 : i.severity === "medium" ? 2 : 1), 0);
    return score(b) - score(a);
  });
  const clean = rows.length - flagged.length;

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="SEO Audit"
        description={`${rows.length} published items checked. ${clean} have no issues, ${flagged.length} need attention.`}
      />
      {flagged.length === 0 ? (
        <EmptyState message="Everything looks good." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((r) => (
                <TableRow key={`${r.type}-${r.id}`}>
                  <TableCell className="align-top">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type}
                      {r.noIndex && " · noindex"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {r.issues.map((i) => (
                        <Badge key={i.label} variant={SEV[i.severity]} className="font-normal">
                          {i.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Button size="sm" variant="outline" render={<Link href={r.editHref} />}>
                      Fix
                    </Button>
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
