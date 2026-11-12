import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqForm } from "@/components/admin/faq-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit FAQ" };

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Edit FAQ</h1>
      </div>
      <FaqForm faq={faq} />
    </div>
  );
}
