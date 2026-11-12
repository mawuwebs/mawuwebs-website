import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Briefcase,
  FolderKanban,
  Newspaper,
  Mail,
  Plus,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const QUICK_ACTIONS = [
  { label: "New Page", href: "/admin/pages/new" },
  { label: "New Service", href: "/admin/services/new" },
  { label: "New Project", href: "/admin/projects/new" },
  { label: "New Blog Post", href: "/admin/posts/new" },
  { label: "New Testimonial", href: "/admin/testimonials/new" },
  { label: "New FAQ", href: "/admin/faqs/new" },
];

export default async function AdminOverviewPage() {
  const [
    totalPages,
    totalPosts,
    totalServices,
    totalProjects,
    totalSubmissions,
    newSubmissions,
    recentActivity,
  ] = await Promise.all([
    prisma.page.count(),
    prisma.post.count(),
    prisma.service.count(),
    prisma.project.count(),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { status: "NEW" } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening with your site.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pages" value={totalPages} href="/admin/pages" icon={FileText} />
        <StatCard label="Blog Posts" value={totalPosts} href="/admin/posts" icon={Newspaper} />
        <StatCard label="Services" value={totalServices} href="/admin/services" icon={Briefcase} />
        <StatCard
          label="Projects"
          value={totalProjects}
          href="/admin/projects"
          icon={FolderKanban}
        />
        <StatCard
          label={newSubmissions > 0 ? `Messages (${newSubmissions} new)` : "Messages"}
          value={totalSubmissions}
          href="/admin/messages"
          icon={Mail}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.href}
                render={<Link href={action.href} />}
                variant="outline"
                className="justify-start"
              >
                <Plus className="size-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <History className="size-4" />
            Recent activity
          </h2>
          <ul className="mt-4 space-y-4">
            {recentActivity.map((log) => (
              <li key={log.id} className="text-sm">
                <p className="text-foreground/90">{log.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {log.user?.name ?? "System"} &middot;{" "}
                  {format(log.createdAt, "MMM d, h:mm a")}
                </p>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
