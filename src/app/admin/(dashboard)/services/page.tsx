import type { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { ContentStatusCell } from "@/components/admin/content-status-cell";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { auth } from "@/lib/auth";
import { getIcon } from "@/components/site/icon-map";
import { prisma } from "@/lib/prisma";
import { ListToolbar, parseListParams, statusWhere } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { OrdersAlert } from "@/components/admin/orders-alert";
import { getOrderSummary } from "@/lib/admin-stats";

const PAGE_SIZE = 25;
import { toggleServiceStatus } from "@/lib/actions/services";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const list = parseListParams(await searchParams, PAGE_SIZE);
  const where = {
    AND: [
      statusWhere(list.status),
      list.q ? { OR: [{ title: { contains: list.q } }, { slug: { contains: list.q } }, { description: { contains: list.q } }] } : {},
    ],
  };
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const [orders, services, total] = await Promise.all([
    getOrderSummary(),
    prisma.service.findMany({
      where,
      orderBy: { order: "asc" },
      take: list.take,
      skip: list.skip,
    }),
    prisma.service.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Services"
        description="Manage the services shown on your website."
        newHref="/admin/services/new"
        newLabel="New Service"
      />

      <OrdersAlert summary={orders} />

      <ListToolbar basePath="/admin/services" status={list.status} q={list.q} searchLabel="Search services" />

      {services.length === 0 ? (
        <EmptyState message={list.q || list.status ? "Nothing matches these filters." : "No services yet. Create your first one."} />
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const Icon = getIcon(service.icon);
                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium">{service.title}</p>
                          <p className="text-xs text-muted-foreground">/{service.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ContentStatusCell status={service.status} scheduledAt={service.scheduledAt} deletedAt={service.deletedAt} toggle={toggleServiceStatus.bind(null, service.id)} />
                    </TableCell>
                    <TableCell>
                      {service.featured && <Badge variant="outline">Featured</Badge>}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/messages?service=${encodeURIComponent(service.slug)}`}
                        className={orders.perService[service.slug] ? "font-semibold text-accent hover:underline" : "text-muted-foreground hover:underline"}
                      >
                        {orders.perService[service.slug] ? `${orders.perService[service.slug]} waiting` : "View"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{service.order}</TableCell>
                    <TableCell>
                      <ContentRowActions type="service" id={service.id} title={service.title} editHref={`/admin/services/${service.id}`} trashed={list.status === "TRASH"} isAdmin={isAdmin} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <Pagination basePath="/admin/services" params={{ status: list.status || undefined, q: list.q || undefined }} page={list.page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
