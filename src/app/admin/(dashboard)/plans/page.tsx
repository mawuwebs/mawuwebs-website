import type { Metadata } from "next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { ContentStatusCell } from "@/components/admin/content-status-cell";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { ListToolbar, parseListParams, statusWhere } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { togglePlanStatus } from "@/lib/actions/plans";
import { toPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Plans" };

const PAGE_SIZE = 25;

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const list = parseListParams(await searchParams, PAGE_SIZE);
  const where = {
    AND: [statusWhere(list.status), list.q ? { OR: [{ name: { contains: list.q } }, { slug: { contains: list.q } }] } : {}],
  };
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const [plans, total] = await Promise.all([
    prisma.plan.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: list.take, skip: list.skip }),
    prisma.plan.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Plans"
        description="Managed IT plans shown on the Plans page and in the plan enquiry form."
        newHref="/admin/plans/new"
        newLabel="New Plan"
      />

      <ListToolbar basePath="/admin/plans" status={list.status} q={list.q} searchLabel="Search plans" />

      {plans.length === 0 ? (
        <EmptyState message={list.q || list.status ? "Nothing matches these filters." : "No plans yet. Add your first one."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{plan.name}</p>
                        {plan.highlight && <Badge variant="outline">Most popular</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan.tagline || `/${plan.slug}`}
                        {plan.price ? ` · ${plan.price}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{toPlan(plan).features.length}</TableCell>
                    <TableCell>
                      <ContentStatusCell
                        status={plan.status}
                        scheduledAt={plan.scheduledAt}
                        deletedAt={plan.deletedAt}
                        toggle={togglePlanStatus.bind(null, plan.id)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{plan.order}</TableCell>
                    <TableCell>
                      <ContentRowActions type="plan" id={plan.id} title={plan.name} editHref={`/admin/plans/${plan.id}`} trashed={list.status === "TRASH"} isAdmin={isAdmin} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination basePath="/admin/plans" params={{ status: list.status || undefined, q: list.q || undefined }} page={list.page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
