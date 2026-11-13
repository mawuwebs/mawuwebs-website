import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSiteSettings } from "@/lib/settings";
import { getNavBadges } from "@/lib/admin-stats";
import { prisma } from "@/lib/prisma";
import { ForcePasswordGuard } from "@/components/admin/force-password-guard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings, badges] = await Promise.all([auth(), getSiteSettings(), getNavBadges()]);

  if (!session?.user) redirect("/admin/login");
  if (session.user.role === "CLIENT") redirect("/portal");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, name: true, image: true },
  });

  return (
    <AdminShell siteName={settings.siteName} user={{ ...session.user, name: me?.name ?? session.user.name, image: me?.image ?? null }} badges={badges}>
      {me?.mustChangePassword && <ForcePasswordGuard />}
      {children}
    </AdminShell>
  );
}
