import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { prisma } from "@/lib/prisma";
import { EditHeader, RevisionHistory } from "@/components/admin/edit-chrome";

export const metadata: Metadata = { title: "Edit Service" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <EditHeader type="service" id={service.id} heading="Edit Service" title={service.title} trashed={!!service.deletedAt} />
      {!service.deletedAt && <ServiceForm service={service} />}
      <RevisionHistory type="service" id={service.id} />
    </div>
  );
}
