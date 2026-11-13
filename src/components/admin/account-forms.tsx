"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, Copy, Download, Eye, EyeOff, Loader2, ShieldCheck, ShieldOff, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  beginTotpSetup,
  changePassword,
  removeAvatar,
  updateOwnProfile,
  uploadAvatar,
  confirmTotpSetup,
  disableTotp,
  type AccountState,
} from "@/lib/actions/account";
import { passwordStrength } from "@/lib/password-utils";
import { cn } from "@/lib/utils";

const initial: AccountState = { success: false, message: "" };

function Submit({ children, variant, disabled }: { children: React.ReactNode; variant?: "default" | "destructive" | "outline"; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} variant={variant}>
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

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  showStrength = false,
  minLength,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
  showStrength?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = React.useState(false);
  const pw = passwordStrength(value);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 flex items-center gap-2" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full bg-muted transition-colors", pw.score >= i && pw.color)} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{pw.label}</span>
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [state, action] = useActionState(changePassword, initial);
  const mismatch = confirm.length > 0 && confirm !== next;
  const match = confirm.length > 0 && confirm === next;
  return (
    <form action={action} className="max-w-md space-y-4">
      <PasswordField id="current" name="current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField
        id="next"
        name="next"
        label="New password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        minLength={10}
        showStrength
        hint="At least 10 characters. Longer is better; a few random words work well."
      />
      <div>
        <PasswordField id="confirm" name="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={10} />
        {mismatch && (
          <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
            <X className="size-3" /> Passwords don&apos;t match yet.
          </p>
        )}
        {match && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3" /> Passwords match.
          </p>
        )}
      </div>
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        After changing your password you&apos;ll be signed out on every device and asked to sign in again.
      </p>
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
              navigator.clipboard.writeText(text).then(
                () => toast.success("Recovery codes copied."),
                () => toast.error("Couldn't copy. Use Download instead.")
              );
            }}
          >
            <Copy className="size-4" /> Copy codes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 ml-2"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([text + "\n"], { type: "text/plain" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "recovery-codes.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4" /> Download
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
            <img src={setup.qr} alt="QR code for your authenticator app" width={200} height={200} className="mt-2 rounded-xl border border-border bg-white p-1" />
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
            maxLength={8}
            className="w-36 text-center font-mono text-lg tracking-[0.4em]"
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

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function ProfileForm({ name, email, image }: { name: string; email: string; image: string | null }) {
  const router = useRouter();
  const [photo, setPhoto] = React.useState(image);
  const [liveName, setLiveName] = React.useState(name);
  const [liveEmail, setLiveEmail] = React.useState(email);
  const [busy, startTransition] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(async (p: AccountState, f: FormData) => {
    const r = await updateOwnProfile(p, f);
    if (r.success) router.refresh();
    return r;
  }, initial);
  const emailChanged = liveEmail.trim().toLowerCase() !== email;
  const dirty = emailChanged || liveName.trim() !== name;

  function pick(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const r = await uploadAvatar(fd);
      if (r.success) {
        setPhoto(r.url ?? null);
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await removeAvatar();
      if (r.success) {
        setPhoto(null);
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-20 text-xl">
          {photo && <AvatarImage src={photo} alt="" />}
          <AvatarFallback className="bg-primary/10 text-xl font-medium text-primary">{initialsOf(liveName) || "?"}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {photo ? "Change photo" : "Upload photo"}
            </Button>
            {photo && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG or WEBP, up to 2MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" name="name" value={liveName} onChange={(e) => setLiveName(e.target.value)} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" name="email" type="email" value={liveEmail} onChange={(e) => setLiveEmail(e.target.value)} required className="mt-1.5" />
        </div>
        {emailChanged && (
          <div>
            <Label htmlFor="profile-password">Current password</Label>
            <Input id="profile-password" name="password" type="password" required autoComplete="current-password" className="mt-1.5" />
            <p className="mt-1.5 text-xs text-muted-foreground">Needed because your email is how you sign in.</p>
          </div>
        )}
        <Message state={state} />
        <Submit disabled={!dirty}>Save profile</Submit>
      </form>
    </div>
  );
}
