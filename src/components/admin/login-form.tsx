"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/login";

const initialState: LoginState = { error: "" };

function SubmitButton({ step2 }: { step2: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full bg-orange text-forest hover:bg-orange/90" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
      {step2 ? "Verify and sign in" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const notice = searchParams.get("reset") ? "Password updated. Sign in with your new password." : "";
  // Controlled so the values survive the form reset that follows each action.
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const step2 = Boolean(state.needsCode);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {step2 && (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
        </>
      )}

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success/15 px-3 py-2 text-sm text-white">
          <CheckCircle2 className="size-4 shrink-0" />
          {notice}
        </p>
      )}

      {step2 ? (
        <div>
          <Label htmlFor="code" className="flex items-center gap-1.5 text-white/90">
            <ShieldCheck className="size-4" />
            Verification code
          </Label>
          <Input
            id="code"
            name="code"
            inputMode="text"
            required
            autoFocus
            autoComplete="one-time-code"
            className="mt-1.5 text-center font-mono text-lg tracking-widest"
            placeholder="123 456"
          />
          <p className="mt-2 text-xs text-white/60">
            Enter the 6-digit code from your authenticator app, or one of your recovery codes.
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-white/90" htmlFor="email-field">Email</Label>
            <Input
              id="email-field"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="mt-1.5"
              placeholder="admin@mawuwebs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-white/90" htmlFor="password-field">Password</Label>
              <Link href="/admin/forgot-password" className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password-field"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </>
      )}

      {state.error && (
        <p role="alert" className="animate-shake flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <SubmitButton step2={step2} />
    </form>
  );
}
