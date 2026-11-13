import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requirePortalUser } from "@/lib/portal";
import { getSiteSettings } from "@/lib/settings";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/projects", label: "Projects" },
  { href: "/portal/billing", label: "Quotes and invoices" },
  { href: "/portal/tickets", label: "Support requests" },
  { href: "/portal/assets", label: "Equipment" },
  { href: "/portal/documents", label: "Documents" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requirePortalUser(), getSiteSettings()]);
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/portal" aria-label="Portal home">
            <Logo height={36} name={settings.siteName} nameClassName="text-base" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.company || user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/portal/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
        <nav aria-label="Portal" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-t-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
