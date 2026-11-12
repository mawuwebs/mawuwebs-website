import nodemailer from "nodemailer";

/**
 * SMTP mailer. Configure with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.
 * When SMTP_HOST is unset every send is skipped, so local dev works without mail.
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transport;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Never throws: a mail failure must not fail the visitor's form submission. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!mailConfigured()) {
    console.info(`[mail] SMTP not configured, skipped: "${opts.subject}"`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(opts.text).replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1">$1</a>'
      )}</div>`,
    });
    return true;
  } catch (err) {
    console.error("[mail] send failed", err);
    return false;
  }
}

export function notifyEmail(fallback: string) {
  return process.env.NOTIFY_EMAIL || fallback;
}

export function siteUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}
