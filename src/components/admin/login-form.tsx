"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/login";

const initialState: LoginState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
      Sign in
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="mt-1.5"
          placeholder="admin@mawuwebs.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p role="alert" className="animate-shake flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
