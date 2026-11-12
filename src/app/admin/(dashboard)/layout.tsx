import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings] = await Promise.all([auth(), getSiteSettings()]);

  if (!session?.user) redirect("/admin/login");

  return (
    <AdminShell siteName={settings.siteName} user={session.user}>
      {children}
    </AdminShell>
  );
}
