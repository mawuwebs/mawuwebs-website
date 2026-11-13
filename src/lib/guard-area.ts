import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Area } from "@/lib/permissions";

/** For page layouts: send people without access back to the dashboard home. */
export async function guardArea(area: Area) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (!can(session.user.role, area)) redirect("/admin");
}
