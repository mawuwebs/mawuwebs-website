"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  beginTotpSetup,
  changePassword,
  confirmTotpSetup,
  disableTotp,
  type AccountState,
} from "@/lib/actions/account";

const initial: AccountState = { success: false, message: "" };

function Submit({ children, variant }: { children: React.ReactNode; variant?: "default" | "destructive" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

function Message({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return (
    <p role={state.success ? "status" : "alert"} className={`flex items-center gap-2 text-sm ${state.success ? "text-success" : "text-destructive"}`}>
      {state.success ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {state.message}
    </p>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, initial);
  return (
    <form action={action} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">At least 10 characters. You&apos;ll be signed out everywhere afterwards.</p>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5" />
      </div>
      <Message state={state} />
      <Submit>Change password</Submit>
    </form>
  );
}

export function TwoFactorCard({ enabled, recoveryLeft }: { enabled: boolean; recoveryLeft: number }) {
  const router = useRouter();
  const [setup, setSetup] = React.useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [offState, offAction] = useActionState(async (p: AccountState, f: FormData) => {
    const r = await disableTotp(p, f);
    if (r.success) router.refresh();
    return r;
  }, initial);

  if (codes) {
    const text = codes.join("\n");
    return (
      <div className="max-w-md space-y-4">
        <p className="flex items-center gap-2 font-medium text-success">
          <ShieldCheck className="size-5" /> Two-factor authentication is on
        </p>
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-sm font-medium">Save your recovery codes</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Each code works once if you lose your phone. They are shown only now, so store them somewhere safe.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => (
              <li key={c} className="rounded bg-background px-2 py-1 text-center">
                {c}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success("Recovery codes copied.");
            }}
          >
            <Copy className="size-4" /> Copy codes
          </Button>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCodes(null);
            router.refresh();
          }}
        >
          I&apos;ve saved them
        </Button>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="max-w-md space-y-4">
        <p className="flex items-center gap-2 font-medium text-success">
          <ShieldCheck className="size-5" /> Two-factor authentication is on
        </p>
        <p className="text-sm text-muted-foreground">
          {recoveryLeft} recovery code{recoveryLeft === 1 ? "" : "s"} left.
          {recoveryLeft <= 2 && " Turn 2FA off and on again to get a fresh set."}
        </p>
        <form action={offAction} className="space-y-3 rounded-xl border border-border p-4">
          <Label htmlFor="off-password">Confirm your password to turn it off</Label>
          <Input id="off-password" name="password" type="password" required autoComplete="current-password" />
          <Message state={offState} />
          <Submit variant="destructive">
            <ShieldOff className="size-4" /> Turn off 2FA
          </Submit>
        </form>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="max-w-md space-y-4">
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy).
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code for your authenticator app" width={220} height={220} className="mt-2 rounded-lg border border-border bg-white" />
            <p className="mt-2 text-xs text-muted-foreground">
              Can&apos;t scan? Enter this key manually: <code className="select-all break-all rounded bg-secondary px-1.5 py-0.5">{setup.secret}</code>
            </p>
          </li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            startTransition(async () => {
              const r = await confirmTotpSetup(code);
              if (r.success) {
                setCodes(r.recoveryCodes);
                setSetup(null);
                setCode("");
              } else setError(r.message);
            });
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-label="6-digit code"
            className="w-36 font-mono tracking-widest"
            required
          />
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Verify and turn on
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </form>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">
        Add a second step at sign-in: a 6-digit code from an app on your phone. Strongly recommended for admins.
      </p>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await beginTotpSetup();
            if (r.success) setSetup({ secret: r.secret, qr: r.qr });
            else toast.error(r.message);
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        <ShieldCheck className="size-4" /> Set up 2FA
      </Button>
    </div>
  );
}
