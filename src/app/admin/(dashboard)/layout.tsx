import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSiteSettings } from "@/lib/settings";
import { getNavBadges } from "@/lib/admin-stats";

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

  return (
    <AdminShell siteName={settings.siteName} user={session.user} badges={badges}>
      {children}
    </AdminShell>
  );
}
