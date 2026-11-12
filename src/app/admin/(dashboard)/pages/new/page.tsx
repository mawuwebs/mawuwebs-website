import type { Metadata } from "next";
import { PageForm } from "@/components/admin/page-form";

export const metadata: Metadata = { title: "New Page" };

export default function NewPagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Page</h1>
        <p className="mt-1 text-muted-foreground">Create a new content page.</p>
      </div>
      <PageForm />
    </div>
  );
}
