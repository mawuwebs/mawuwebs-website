import type { Metadata } from "next";
import { TestimonialForm } from "@/components/admin/testimonial-form";

export const metadata: Metadata = { title: "New Testimonial" };

export default function NewTestimonialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">New Testimonial</h1>
        <p className="mt-1 text-muted-foreground">Add a new client testimonial.</p>
      </div>
      <TestimonialForm />
    </div>
  );
}
