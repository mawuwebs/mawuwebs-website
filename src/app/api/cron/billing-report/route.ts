import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendMail, notifyEmail, siteUrl, mailConfigured } from "@/lib/mail";
import { getSiteSettings } from "@/lib/settings";
import { PAYMENT_METHOD_LABEL, formatMoney } from "@/lib/billing";
import { buildReport, resolveRange } from "@/lib/billing-reports";

/**
 * Emailed billing summary for the PREVIOUS full period. Schedule one or more:
 *   daily   (every morning):      /api/cron/billing-report?period=daily
 *   weekly  (Monday morning):     /api/cron/billing-report?period=weekly
 *   monthly (1st of the month):   /api/cron/billing-report?period=monthly
 * Header: Authorization: Bearer $CRON_SECRET. Disabled (404) until CRON_SECRET is set.
 * Add &dry=1 to see the JSON without sending an email.
 */
const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const p = request.nextUrl.searchParams;
  const period = p.get("period") === "weekly" ? "weekly" : p.get("period") === "monthly" ? "monthly" : "daily";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let from: Date;
  let to: Date; // inclusive last day
  if (period === "daily") {
    from = to = new Date(+today - DAY);
  } else if (period === "weekly") {
    const thisMonday = new Date(+today - ((today.getUTCDay() + 6) % 7) * DAY);
    from = new Date(+thisMonday - 7 * DAY);
    to = new Date(+thisMonday - DAY);
  } else {
    from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  }
  const range = resolveRange("custom", iso(from), iso(to), now);
  const report = await buildReport(range);
  const settings = await getSiteSettings();
  const label = range.days === 1 ? range.fromS : `${range.fromS} to ${range.toS}`;

  const lines = [`${period[0].toUpperCase()}${period.slice(1)} billing report for ${settings.siteName}`, `Period: ${label} (UTC)`, ""];
  const entries = Object.entries(report);
  if (!entries.length) lines.push("No invoices or payments in this period.", "");
  for (const [c, r] of entries) {
    lines.push(
      `${c}`,
      `  Invoiced:    ${formatMoney(r.invoiced, c)} (${r.invoiceCount} invoice${r.invoiceCount === 1 ? "" : "s"})`,
      `  Collected:   ${formatMoney(r.collected, c)} (${r.paymentCount} payment${r.paymentCount === 1 ? "" : "s"})`,
      ...(r.refunded > 0 ? [`  Refunded:    -${formatMoney(r.refunded, c)} (net ${formatMoney(r.net, c)})`] : []),
      `  Outstanding: ${formatMoney(r.outstanding, c)} (now)`,
      `  Overdue:     ${formatMoney(r.overdue, c)} (now)`,
      ...(r.outstanding > 0 ? [`  Aging (now): not due ${formatMoney(r.aging.current, c)} | 1-30d ${formatMoney(r.aging.d1_30, c)} | 31-60d ${formatMoney(r.aging.d31_60, c)} | 60d+ ${formatMoney(r.aging.d61plus, c)}`] : []),
      ...r.byMethod.map((m) => `    - ${PAYMENT_METHOD_LABEL[m.method] ?? m.method}: ${formatMoney(m.amount, c)} (${m.count})`),
      "",
    );
  }
  lines.push(`Full report: ${siteUrl()}/admin/billing/reports?period=custom&from=${range.fromS}&to=${range.toS}`);

  const summary = entries.map(([c, r]) => ({ currency: c, invoiced: r.invoiced, collected: r.collected, outstanding: r.outstanding, overdue: r.overdue }));
  if (p.get("dry") === "1") return NextResponse.json({ period, from: range.fromS, to: range.toS, summary, emailed: false, dry: true });

  const headline = entries.length ? entries.map(([c, r]) => `${formatMoney(r.collected, c)} collected`).join(", ") : "no activity";
  const emailed = mailConfigured()
    ? await sendMail({ to: notifyEmail(settings.contactEmail), subject: `Billing ${period} report (${label}): ${headline}`, text: lines.join("\n") })
    : false;
  return NextResponse.json({ period, from: range.fromS, to: range.toS, summary, emailed });
}
