"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, resetPassword, type AccountState } from "@/lib/actions/account";

const initial: AccountState = { success: false, message: "" };

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full bg-orange text-forest hover:bg-orange/90" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

function Message({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return state.success ? (
    <p role="status" className="flex items-start gap-2 rounded-lg bg-success/15 px-3 py-2 text-sm text-white">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      {state.message}
    </p>
  ) : (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {state.message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="space-y-5">
      <div>
        <Label className="text-white/90" htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus className="mt-1.5" />
      </div>
      <Message state={state} />
      <Submit>Send reset link</Submit>
      <p className="text-center text-sm">
        <Link href="/admin/login" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, initial);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label className="text-white/90" htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" autoFocus className="mt-1.5" />
        <p className="mt-1.5 text-xs text-white/60">At least 10 characters.</p>
      </div>
      <div>
        <Label className="text-white/90" htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5" />
      </div>
      <Message state={state} />
      <Submit>Set new password</Submit>
    </form>
  );
}
