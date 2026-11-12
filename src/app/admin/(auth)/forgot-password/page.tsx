import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm sm:p-10">
      <h1 className="font-display text-2xl font-bold text-white">Forgot your password?</h1>
      <p className="mt-2 text-sm text-white/60">Enter your admin email and we&apos;ll send you a link to choose a new one.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
