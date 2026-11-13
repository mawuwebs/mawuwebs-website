import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Clock, ShieldCheck, ShieldOff, UserCog, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { UserManageSheet, type ManagedUser } from "@/components/admin/user-manage-sheet";
import { EmptyState } from "@/components/admin/list-page-header";
import { SearchBox } from "@/components/admin/search-box";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, ROLE_META, roleLabel, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

type Params = { q?: string; role?: string; sort?: string; dir?: string };

const SORTS = {
  name: "name",
  role: "role",
  active: "lastLoginAt",
  joined: "createdAt",
} as const;
type SortKey = keyof typeof SORTS;

/** An invite link was issued and the person hasn't signed in since. */
function invitePending(u: { lastLoginAt: Date | null; _count: { resetTokens: number } }) {
  return !u.lastLoginAt && u._count.resetTokens > 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const role = (ROLES as string[]).includes(params.role ?? "") ? (params.role as Role) : "";
  const sort: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : "joined";
  const dir = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : sort === "active" ? "desc" : "asc";

  const [all, users] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "CLIENT" } }, select: { role: true, totpEnabled: true, disabledAt: true } }),
    prisma.user.findMany({
      where: {
        role: role ? role : { not: "CLIENT" },
        ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      },
      orderBy: { [SORTS[sort]]: dir },
      include: { _count: { select: { posts: true, resetTokens: true } } },
    }),
  ]);

  const admins = all.filter((u) => u.role === "ADMIN").length;
  const staff = all.length - admins;
  const roleCount = (r: Role) => all.filter((u) => u.role === r).length;
  const secured = all.filter((u) => u.totpEnabled).length;

  const stats = [
    { label: "Total users", value: all.length, icon: Users },
    { label: "Admins", value: admins, icon: ShieldCheck },
    { label: "Team members", value: staff, icon: UserCog },
    { label: "2FA enabled", value: `${secured}/${all.length}`, icon: ShieldCheck },
  ];

  const href = (next: Partial<Params>) => {
    const merged = { q, role, sort: params.sort, dir: params.dir, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active ? "border-forest bg-forest text-white" : "border-border hover:border-foreground/30"
    );

  const sortHead = (id: SortKey, children: React.ReactNode) => {
    const active = sort === id;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead key={id} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
        <Link
          href={href({ sort: id, dir: nextDir })}
          className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
        >
          {children}
          <Icon className="size-3.5" />
        </Link>
      </TableHead>
    );
  };

  const rows = users.map((user) => {
    const isSelf = user.id === session.user.id;
    const managed: ManagedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      totpEnabled: user.totpEnabled,
      disabled: Boolean(user.disabledAt),
      neverSignedIn: invitePending(user),
      posts: user._count.posts,
    };
    return { user, isSelf, managed };
  });

  const statusBadge = (u: (typeof users)[number]) =>
    u.disabledAt ? (
      <Badge variant="destructive">
        <Ban className="size-3" />
        Deactivated
      </Badge>
    ) : invitePending(u) ? (
      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <Clock className="size-3" />
        Invite pending
      </Badge>
    ) : null;

  const twoFa = (on: boolean) =>
    on ? (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
        <ShieldCheck className="size-3" />
        2FA on
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        <ShieldOff className="size-3" />
        2FA off
      </Badge>
    );

  const lastActive = (d: Date | null, pending: boolean) =>
    d ? (
      <>
        <p className="text-sm">{formatDistanceToNow(d, { addSuffix: true })}</p>
        <p className="text-xs text-muted-foreground">{format(d, "MMM d, yyyy")}</p>
      </>
    ) : (
      <p className="text-sm text-muted-foreground">{pending ? "Never" : "Not recorded yet"}</p>
    );

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-top-2 flex flex-col items-start justify-between gap-4 duration-500 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Users</h1>
          <p className="mt-1 text-muted-foreground">Manage who can sign in, and what they can do.</p>
        </div>
        <UserFormDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
          <Link href={href({ role: "" })} className={pill(!role)} aria-current={!role ? "page" : undefined}>
            All ({all.length})
          </Link>
          {ROLES.filter((r) => roleCount(r) > 0 || role === r).map((r) => (
            <Link key={r} href={href({ role: r })} className={pill(role === r)} aria-current={role === r ? "page" : undefined}>
              {ROLE_META[r].label} ({roleCount(r)})
            </Link>
          ))}
        </div>
        <SearchBox placeholder="Search name or email" className="w-full sm:w-72" />
      </div>

      {rows.length === 0 ? (
        <EmptyState message={q || role ? "No users match your filters." : "No users yet."} />
      ) : (
        <>
          {/* Phones: stacked cards */}
          <ul className="space-y-3 sm:hidden">
            {rows.map(({ user, isSelf, managed }) => (
              <li key={user.id} className={cn("rounded-2xl border border-border bg-card p-4", user.disabledAt && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <Avatar size="lg">
                    {user.image && <AvatarImage src={user.image} alt="" />}
                    <AvatarFallback className="bg-primary/10 font-medium text-primary">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{user.name}</span>
                      {isSelf && <Badge variant="secondary">You</Badge>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>{roleLabel(user.role)}</Badge>
                  {twoFa(user.totpEnabled)}
                  {statusBadge(user)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {user.lastLoginAt ? `Active ${formatDistanceToNow(user.lastLoginAt, { addSuffix: true })}` : invitePending(user) ? "Invite pending" : "Last active not recorded"}
                    {" · "}
                    {user._count.posts} post{user._count.posts === 1 ? "" : "s"}
                  </span>
                  {!isSelf && <UserManageSheet user={managed} />}
                </div>
              </li>
            ))}
          </ul>

          {/* Larger screens: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {sortHead("name", "User")}
                  {sortHead("role", "Role")}
                  <TableHead>Security</TableHead>
                  {sortHead("active", "Last active")}
                  {sortHead("joined", "Joined")}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ user, isSelf, managed }) => (
                  <TableRow key={user.id} className={cn(user.disabledAt && "opacity-70")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          {user.image && <AvatarImage src={user.image} alt="" />}
                          <AvatarFallback className="bg-primary/10 font-medium text-primary">{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className="truncate">{user.name}</span>
                            {isSelf && <Badge variant="secondary">You</Badge>}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {user._count.posts} post{user._count.posts === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                          {roleLabel(user.role)}
                        </Badge>
                      ) : (
                        <UserRoleSelect userId={user.id} role={user.role as Exclude<typeof user.role, "CLIENT">} name={user.name} />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        {twoFa(user.totpEnabled)}
                        {statusBadge(user)}
                      </div>
                    </TableCell>
                    <TableCell>{lastActive(user.lastLoginAt, invitePending(user))}</TableCell>
                    <TableCell>
                      <p className="text-sm">{format(user.createdAt, "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(user.createdAt, { addSuffix: true })}</p>
                    </TableCell>
                    <TableCell className="text-right">{!isSelf && <UserManageSheet user={managed} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
