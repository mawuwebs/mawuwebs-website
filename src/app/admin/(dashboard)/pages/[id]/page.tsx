import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/page-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Page" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Edit Page</h1>
        <p className="mt-1 text-muted-foreground">{page.title}</p>
      </div>
      <PageForm page={page} />
    </div>
  );
}
