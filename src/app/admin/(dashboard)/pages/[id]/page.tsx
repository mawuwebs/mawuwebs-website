import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/page-form";
import { prisma } from "@/lib/prisma";
import { EditHeader, RevisionHistory } from "@/components/admin/edit-chrome";

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
      <EditHeader type="page" id={page.id} heading="Edit Page" title={page.title} trashed={!!page.deletedAt} />
      {!page.deletedAt && <PageForm page={page} />}
      <RevisionHistory type="page" id={page.id} />
    </div>
  );
}
