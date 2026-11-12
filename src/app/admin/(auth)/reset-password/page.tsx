import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm sm:p-10">
      <h1 className="font-display text-2xl font-bold text-white">Choose a new password</h1>
      {token ? (
        <div className="mt-8">
          <ResetPasswordForm token={token} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/70">
          This link is missing its token.{" "}
          <Link href="/admin/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
