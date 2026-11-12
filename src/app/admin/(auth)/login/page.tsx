import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
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
        <Logo height={88} name={settings.siteName} className="flex-col gap-3" nameClassName="text-2xl text-white" accentClassName="text-[#f5a623]" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Admin Sign In</h1>
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
