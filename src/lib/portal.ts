import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** For portal pages: signed-in, active CLIENT user. Staff are sent to the admin, visitors to the portal login. */
export async function requirePortalUser() {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");
  if (session.user.role !== "CLIENT") redirect("/admin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, company: true, role: true, disabledAt: true },
  });
  if (!user || user.disabledAt || user.role !== "CLIENT") redirect("/portal/login");
  return user;
}

/** For portal server actions: same check, but throws instead of redirecting. */
export async function requireClientAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") throw new Error("Please sign in again.");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, company: true, disabledAt: true },
  });
  if (!user || user.disabledAt) throw new Error("Please sign in again.");
  return user;
}

export * from "@/lib/portal-constants";
