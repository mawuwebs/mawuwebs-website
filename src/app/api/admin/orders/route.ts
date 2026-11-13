import { NextResponse } from "next/server";
import { can } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { getOrderSummary } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

/** Polled by the admin shell so new orders show up without a reload. Signed-in staff only. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(session.user.role, "orders")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { total, urgent, overdue, latest } = await getOrderSummary();
  return NextResponse.json({ total, urgent, overdue, latest: latest ? { name: latest.name } : null });
}
