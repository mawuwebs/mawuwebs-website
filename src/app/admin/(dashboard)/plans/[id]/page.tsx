import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanForm } from "@/components/admin/plan-form";
import { EditHeader, RevisionHistory } from "@/components/admin/edit-chrome";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Plan" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <EditHeader type="plan" id={plan.id} heading="Edit Plan" title={plan.name} trashed={!!plan.deletedAt} />
      {!plan.deletedAt && <PlanForm plan={plan} />}
      <RevisionHistory type="plan" id={plan.id} />
    </div>
  );
}
