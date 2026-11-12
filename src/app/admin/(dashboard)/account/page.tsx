import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm, TwoFactorCard } from "@/components/admin/account-forms";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  let recoveryLeft = 0;
  try {
    recoveryLeft = (JSON.parse(user.recoveryCodes) as unknown[]).length;
  } catch {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My account</h1>
        <p className="mt-1 text-muted-foreground">
          {user.name} &middot; {user.email} &middot; {user.role === "ADMIN" ? "Admin" : "Editor"}
          {user.passwordChangedAt && <> &middot; password changed {format(user.passwordChangedAt, "MMM d, yyyy")}</>}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Two-factor authentication</h2>
        <div className="mt-4">
          <TwoFactorCard enabled={user.totpEnabled} recoveryLeft={recoveryLeft} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
