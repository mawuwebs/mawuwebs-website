import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUserAccount } from "@/lib/actions/settings";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Users</h1>
          <p className="mt-1 text-muted-foreground">Manage admin and editor accounts.</p>
        </div>
        <UserFormDialog />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(user.createdAt, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  {user.id !== session.user.id && (
                    <DeleteButton
                      itemLabel={user.name}
                      action={deleteUserAccount.bind(null, user.id)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
