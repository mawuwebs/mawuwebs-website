import type { APIRequestContext } from "@playwright/test";

export type Mail = { from: string; to: string[]; subject: string; text: string };
const SINK = "http://127.0.0.1:2526/messages";

export async function mails(request: APIRequestContext): Promise<Mail[]> {
  return (await request.get(SINK)).json();
}
export async function clearMail(request: APIRequestContext) {
  await request.delete(SINK);
}
/** Messages to `to` whose subject matches. */
export async function mailsTo(request: APIRequestContext, to: string, subject?: RegExp | string): Promise<Mail[]> {
  return (await mails(request)).filter((m) => m.to.includes(to) && (subject === undefined || (typeof subject === "string" ? m.subject.includes(subject) : subject.test(m.subject))));
}
