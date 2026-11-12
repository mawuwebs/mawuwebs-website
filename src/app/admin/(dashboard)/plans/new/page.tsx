import type { Metadata } from "next";
import { PlanForm } from "@/components/admin/plan-form";

export const metadata: Metadata = { title: "New Plan" };

export default function NewPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Plan</h1>
        <p className="mt-1 text-muted-foreground">Add a managed IT plan to the Plans page.</p>
      </div>
      <PlanForm />
    </div>
  );
}
