"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";

export type LoginState = {
  error: string;
  needsCode?: boolean;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const rawCallback = (formData.get("callbackUrl") as string) || "/admin";
  // Only same-site admin paths: never redirect to an attacker-supplied URL.
  const callbackUrl = rawCallback.startsWith("/admin") && !rawCallback.startsWith("//") ? rawCallback : "/admin";

  // Slow down password guessing: per IP overall, and per IP + account.
  const who = String(email ?? "").toLowerCase().slice(0, 100);
  if ((await rateLimited("login", 15, 15 * 60_000)) || (await rateLimited(`login:${who}`, 5, 15 * 60_000))) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const code = String(formData.get("code") ?? "").trim();

  // Second step only when the password is right and the account has 2FA on.
  if (!code && who && typeof password === "string") {
    const u = await prisma.user.findUnique({ where: { email: String(email) }, select: { passwordHash: true, totpEnabled: true } });
    if (u?.totpEnabled && (await bcrypt.compare(password, u.passwordHash))) {
      return { error: "", needsCode: true };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      code,
      redirectTo: callbackUrl,
    });
    return { error: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: code ? "That code is not valid. Try again or use a recovery code." : "Invalid email or password.", needsCode: Boolean(code) };
    }
    throw error;
  }
}
