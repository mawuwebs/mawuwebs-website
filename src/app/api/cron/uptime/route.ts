import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { cronGuard } from "@/lib/cron-auth";
import { sendMail, notifyEmail, siteUrl } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { formatDuration, isUpStatus } from "@/lib/automation";

/**
 * Pings every client item that has a monitor URL. Alerts you once when a site goes down and once when it recovers.
 * Run every 15 minutes:  curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/uptime
 * A failure is retried once after 5 seconds before it counts, to avoid false alarms. Disabled (404) until CRON_SECRET is set.
 */
async function probe(url: string): Promise<{ up: boolean; detail: string }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "uptime-check" }, cache: "no-store" });
    await res.body?.cancel();
    return { up: isUpStatus(res.status), detail: `HTTP ${res.status}` };
  } catch (err) {
    return { up: false, detail: err instanceof Error ? (err.name === "TimeoutError" ? "timed out after 10s" : err.message) : "request failed" };
  }
}

export async function GET(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;

  const sites = await prisma.clientAsset.findMany({
    where: { monitorUrl: { not: "" }, user: { disabledAt: null } },
    include: { user: { select: { name: true, company: true } } },
    take: 200,
  });
  const settings = await getSiteSettings();
  let down = 0;
  let alerts = 0;

  for (const s of sites) {
    let r = await probe(s.monitorUrl);
    if (!r.up) {
      await new Promise((res) => setTimeout(res, 5_000));
      r = await probe(s.monitorUrl);
    }
    const now = new Date();
    const who = `${s.user.company || s.user.name}: ${s.name}`;
    if (!r.up) down++;

    if (!r.up && !s.monitorDownSince) {
      const claim = await prisma.clientAsset.updateMany({ where: { id: s.id, monitorDownSince: null }, data: { monitorDownSince: now, monitorCheckedAt: now } });
      if (!claim.count) continue;
      alerts++;
      await logActivity({ userId: null, action: "updated", entityType: "Client", entityId: s.userId, message: `${who} is down (${r.detail})` });
      await sendMail({ to: notifyEmail(settings.contactEmail), subject: `DOWN: ${who}`, text: `${s.monitorUrl} is not responding (${r.detail}).\n\nWe will email again when it recovers.\n\n${siteUrl()}/admin/clients/${s.userId}` });
    } else if (r.up && s.monitorDownSince) {
      const claim = await prisma.clientAsset.updateMany({ where: { id: s.id, monitorDownSince: s.monitorDownSince }, data: { monitorDownSince: null, monitorCheckedAt: now } });
      if (!claim.count) continue;
      alerts++;
      const took = formatDuration(now.getTime() - s.monitorDownSince.getTime());
      await logActivity({ userId: null, action: "updated", entityType: "Client", entityId: s.userId, message: `${who} recovered after ${took}` });
      await sendMail({ to: notifyEmail(settings.contactEmail), subject: `Recovered: ${who}`, text: `${s.monitorUrl} is back up after about ${took}.\n\n${siteUrl()}/admin/clients/${s.userId}` });
    } else {
      await prisma.clientAsset.update({ where: { id: s.id }, data: { monitorCheckedAt: now } });
    }
  }
  return NextResponse.json({ checked: sites.length, down, alerts });
}
