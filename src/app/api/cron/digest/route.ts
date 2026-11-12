import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, notifyEmail, siteUrl, mailConfigured } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { kindOf, KIND_LABEL, statusLabel } from "@/lib/submission";

/**
 * Weekly lead digest. Call it from a scheduler (Hostinger cron, cron-job.org, GitHub Actions):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/digest
 * Disabled (404) until CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recent, waiting, settings] = await Promise.all([
    prisma.contactSubmission.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
    prisma.contactSubmission.findMany({
      where: { status: "NEW", createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "asc" },
    }),
    getSiteSettings(),
  ]);

  const byKind: Record<string, number> = {};
  for (const s of recent) byKind[KIND_LABEL[kindOf(s)]] = (byKind[KIND_LABEL[kindOf(s)]] ?? 0) + 1;

  const lines = [
    `Weekly enquiry digest for ${settings.siteName}`,
    "",
    `New in the last 7 days: ${recent.length}`,
    ...Object.entries(byKind).map(([k, n]) => `  - ${k}: ${n}`),
    "",
    waiting.length
      ? `Still marked NEW after more than a day (${waiting.length}). These need a reply:`
      : "Nothing is waiting for a first reply. Nice.",
    ...waiting.slice(0, 15).map(
      (s) => `  - ${s.name} <${s.email}> | ${KIND_LABEL[kindOf(s)]} | ${s.createdAt.toISOString().slice(0, 10)}`
    ),
    "",
    "Recent enquiries:",
    ...recent.slice(0, 20).map(
      (s) => `  - ${s.createdAt.toISOString().slice(0, 10)} | ${KIND_LABEL[kindOf(s)]} | ${s.name} | ${statusLabel(s.status)}`
    ),
    "",
    `Open the inbox: ${siteUrl()}/admin/messages`,
  ];

  const sent = mailConfigured()
    ? await sendMail({ to: notifyEmail(settings.contactEmail), subject: `Enquiry digest: ${recent.length} new, ${waiting.length} waiting`, text: lines.join("\n") })
    : false;

  return NextResponse.json({ recent: recent.length, waiting: waiting.length, emailed: sent });
}
