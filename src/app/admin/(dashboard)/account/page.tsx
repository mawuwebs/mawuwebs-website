import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Check, CircleDashed, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { roleLabel } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm, ProfileForm, TwoFactorCard } from "@/components/admin/account-forms";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My account" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  let recoveryLeft = 0;
  try {
    recoveryLeft = (JSON.parse(user.recoveryCodes) as unknown[]).length;
  } catch {}

  const checks = [
    { label: "Two-factor authentication", ok: user.totpEnabled, hint: "Add a second step at sign-in", href: "#security" },
    { label: "Own password chosen", ok: !user.mustChangePassword && Boolean(user.passwordChangedAt), hint: "Replace the temporary or original password", href: "#password" },
    { label: "Recovery codes in reserve", ok: user.totpEnabled && recoveryLeft > 2, hint: user.totpEnabled ? "Fewer than 3 left; turn 2FA off and on for new ones" : "Comes with two-factor", href: "#security" },
  ];
  const done = checks.filter((c) => c.ok).length;

  const nav = [
    { href: "#profile", label: "Profile", icon: UserRound },
    { href: "#security", label: "Two-factor", icon: ShieldCheck },
    { href: "#password", label: "Password", icon: KeyRound },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar className="size-20 text-2xl">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-primary/10 text-2xl font-medium text-primary">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{user.name}</h1>
            <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>{roleLabel(user.role)}</Badge>
          </div>
          <p className="mt-1 truncate text-muted-foreground">{user.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Member since {format(user.createdAt, "MMM d, yyyy")}
            {user.lastLoginAt && <> &middot; last sign-in {formatDistanceToNow(user.lastLoginAt, { addSuffix: true })}</>}
            {user.passwordChangedAt && <> &middot; password changed {format(user.passwordChangedAt, "MMM d, yyyy")}</>}
          </p>
        </div>
      </div>

      {user.mustChangePassword && (
        <div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Choose a new password to continue</p>
          <p className="mt-1 text-muted-foreground">
            You&apos;re using a temporary password. Change it in the Password section, then sign in again to use the dashboard.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Account sections" className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted lg:border-transparent"
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </a>
            ))}
          </nav>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Account security</span>
              <span className="text-muted-foreground">
                {done}/{checks.length}
              </span>
            </div>
            <div className="mt-2 flex gap-1" role="img" aria-label={`${done} of ${checks.length} security steps done`}>
              {checks.map((c) => (
                <span key={c.label} className={cn("h-1.5 flex-1 rounded-full", c.ok ? "bg-success" : "bg-muted")} />
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-xs">
                  {c.ok ? (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    <span className={cn("block font-medium", c.ok && "text-muted-foreground")}>{c.label}</span>
                    {!c.ok && (
                      <a href={c.href} className="text-muted-foreground underline-offset-2 hover:underline">
                        {c.hint}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-6">
          <Section id="profile" icon={UserRound} title="Profile" description="Your photo, name and sign-in email.">
            <ProfileForm name={user.name} email={user.email} image={user.image} />
          </Section>

          <Section
            id="security"
            icon={ShieldCheck}
            title="Two-factor authentication"
            description="Ask for a code from your phone at sign-in, so a stolen password isn't enough."
          >
            <TwoFactorCard enabled={user.totpEnabled} recoveryLeft={recoveryLeft} />
          </Section>

          <Section id="password" icon={KeyRound} title="Password" description="Use a long, unique password you don't use anywhere else.">
            <ChangePasswordForm />
          </Section>
        </div>
      </div>
    </div>
  );
}
