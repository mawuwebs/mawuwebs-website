import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { prisma } from "@/lib/prisma";

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
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Edit Service</h1>
        <p className="mt-1 text-muted-foreground">{service.title}</p>
      </div>
      <ServiceForm service={service} />
    </div>
  );
}
