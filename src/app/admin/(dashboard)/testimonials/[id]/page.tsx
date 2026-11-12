import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Testimonial" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Edit Testimonial</h1>
        <p className="mt-1 text-muted-foreground">{testimonial.name}</p>
      </div>
      <TestimonialForm testimonial={testimonial} />
    </div>
  );
}
