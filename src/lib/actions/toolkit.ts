"use server";

import { cookies } from "next/headers";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { TOOLKIT_COOKIE } from "@/lib/it-toolkit";

/** Email gate: records the address as a subscriber, then unlocks the toolkit on this browser for a year. */
export async function unlockToolkit(prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  formData.set("source", "it-toolkit");
  const res = await subscribeToNewsletter(prev, formData);
  if (res.success) {
    (await cookies()).set(TOOLKIT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/resources",
    });
  }
  return res;
}
