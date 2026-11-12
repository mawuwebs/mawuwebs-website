import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/service-form";

export const metadata: Metadata = { title: "New Service" };

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Service</h1>
        <p className="mt-1 text-muted-foreground">Add a new service to your website.</p>
      </div>
      <ServiceForm />
    </div>
  );
}
