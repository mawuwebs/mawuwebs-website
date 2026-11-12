import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderSummary } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

/** Polled by the admin shell so new orders show up without a reload. Signed-in staff only. */
export async function GET() {
  if (!(await auth())?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { total, urgent, overdue, latest } = await getOrderSummary();
  return NextResponse.json({ total, urgent, overdue, latest: latest ? { name: latest.name } : null });
}
