"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = {
  error: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return { error: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
