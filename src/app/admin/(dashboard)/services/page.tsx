import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader, EmptyState } from "@/components/admin/list-page-header";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { DeleteButton } from "@/components/admin/delete-button";
import { getIcon } from "@/components/site/icon-map";
import { prisma } from "@/lib/prisma";
import { deleteService, toggleServiceStatus } from "@/lib/actions/services";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Services"
        description="Manage the services shown on your website."
        newHref="/admin/services/new"
        newLabel="New Service"
      />

      {services.length === 0 ? (
        <EmptyState message="No services yet. Create your first one." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
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
                      <PublishToggle
                        status={service.status}
                        action={toggleServiceStatus.bind(null, service.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {service.featured && <Badge variant="outline">Featured</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{service.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/admin/services/${service.id}`} />}
                          aria-label={`Edit ${service.title}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteButton
                          itemLabel={service.title}
                          action={deleteService.bind(null, service.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
