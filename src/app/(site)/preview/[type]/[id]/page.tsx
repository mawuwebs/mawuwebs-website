import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enablePreview } from "@/lib/content";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/container";
import { RichText } from "@/components/site/rich-text";
import PostPage from "@/app/(site)/blog/[slug]/page";
import ProjectPage from "@/app/(site)/portfolio/[slug]/page";
import ServicePage from "@/app/(site)/services/[slug]/page";
import AboutPage from "@/app/(site)/about/page";
import PrivacyPage from "@/app/(site)/privacy-policy/page";
import TermsPage from "@/app/(site)/terms-of-service/page";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Signed-in preview of any content item exactly as the public page renders it,
 * including drafts, scheduled and trashed items. Never indexed, never cached.
 */
export default async function PreviewPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/admin/login?callbackUrl=${encodeURIComponent(`/preview/${type}/${id}`)}`);

  if (!can(session.user.role, "content")) redirect("/admin");

  let slug: string | undefined;
  let status = "";
  if (type === "post") {
    const r = await prisma.post.findUnique({ where: { id }, select: { slug: true, status: true, deletedAt: true } });
    slug = r?.slug;
    status = r ? (r.deletedAt ? "In trash" : r.status === "DRAFT" ? "Draft" : "Published") : "";
  } else if (type === "project") {
    const r = await prisma.project.findUnique({ where: { id }, select: { slug: true, status: true, deletedAt: true } });
    slug = r?.slug;
    status = r ? (r.deletedAt ? "In trash" : r.status === "DRAFT" ? "Draft" : "Published") : "";
  } else if (type === "service") {
    const r = await prisma.service.findUnique({ where: { id }, select: { slug: true, status: true, deletedAt: true } });
    slug = r?.slug;
    status = r ? (r.deletedAt ? "In trash" : r.status === "DRAFT" ? "Draft" : "Published") : "";
  } else if (type === "page") {
    const r = await prisma.page.findUnique({ where: { id } });
    if (r) {
      slug = r.slug;
      status = r.deletedAt ? "In trash" : r.status === "DRAFT" ? "Draft" : "Published";
    }
  } else notFound();
  if (!slug) notFound();

  enablePreview();
  const slugParams = Promise.resolve({ slug });

  let body: React.ReactNode;
  if (type === "post") body = await PostPage({ params: slugParams });
  else if (type === "project") body = await ProjectPage({ params: slugParams });
  else if (type === "service") body = await ServicePage({ params: slugParams });
  else if (slug === "about") body = await AboutPage();
  else if (slug === "privacy-policy") body = await PrivacyPage();
  else if (slug === "terms-of-service") body = await TermsPage();
  else {
    const page = await prisma.page.findUniqueOrThrow({ where: { id } });
    body = (
      <>
        <PageHeader eyebrow="Page" title={page.title} />
        <Section>
          <RichText html={page.content} className="mx-auto max-w-3xl" />
        </Section>
      </>
    );
  }

  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-forest px-4 py-2 text-center text-sm text-white"
      >
        <strong>Preview</strong>
        <span>This item is {status.toLowerCase()}. Only signed-in admins can see this page.</span>
        <a href="/admin" className="underline underline-offset-2">
          Back to admin
        </a>
      </div>
      {body}
    </>
  );
}
