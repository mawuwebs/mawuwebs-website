import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const settings = await getSiteSettings();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm sm:p-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-orange text-lg font-bold text-forest">
          {settings.siteName.charAt(0)}
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">Admin Sign In</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in to manage {settings.siteName}&apos;s content
        </p>
      </div>

      <div className="mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
