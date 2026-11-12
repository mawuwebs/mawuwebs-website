import type { Metadata } from "next";
import { FaqForm } from "@/components/admin/faq-form";

export const metadata: Metadata = { title: "New FAQ" };

export default function NewFaqPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New FAQ</h1>
        <p className="mt-1 text-muted-foreground">Add a new frequently asked question.</p>
      </div>
      <FaqForm />
    </div>
  );
}
