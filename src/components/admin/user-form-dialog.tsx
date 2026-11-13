"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  FileText,
  Headset,
  PenLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  checkEmailAvailable,
  createUserAccount,
  emailInviteAvailable,
  type UserFormState,
} from "@/lib/actions/users";
import { generatePassword, passwordStrength } from "@/lib/password-utils";
import { AREA_LABEL, ROLES, ROLE_META, type StaffRole as Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const initialState: UserFormState = { success: false, message: "" };

type Mode = "invite" | "password";
type Created = {
  name: string;
  email: string;
  password: string;
  role: Role;
  mode: Mode;
  inviteLink?: string;
  emailed?: boolean;
};

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  EDITOR: PenLine,
  CONTENT: FileText,
  SUPPORT: Headset,
  ADMIN: ShieldCheck,
};

const LAST_ROLE_KEY = "admin:lastNewUserRole";

function roleCan(role: Role) {
  const meta = ROLE_META[role];
  return [...meta.areas.map((a) => AREA_LABEL[a].split(":")[0]), ...(meta.extra ?? [])];
}

const EMAIL_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gamil.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }
  return { copied, copy };
}

export function UserFormDialog() {
  const [open, setOpen] = React.useState(false);
  // Bumping the key remounts the form with fresh state ("Add another").
  const [session, setSession] = React.useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSession((s) => s + 1);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        New User
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <UserFlow key={session} onClose={() => setOpen(false)} onAnother={() => setSession((s) => s + 1)} />
      </DialogContent>
    </Dialog>
  );
}

function UserFlow({ onClose, onAnother }: { onClose: () => void; onAnother: () => void }) {
  const [created, setCreated] = React.useState<Created | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState(() => generatePassword());
  const [show, setShow] = React.useState(false);
  const [role, setRole] = React.useState<Role>("EDITOR");

  // Remember the last non-admin role. Admin is never pre-selected.
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_ROLE_KEY);
      if (saved && saved !== "ADMIN" && (ROLES as string[]).includes(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRole(saved as Role);
      }
    } catch {}
  }, []);

  function pickRole(r: Role) {
    setRole(r);
    try {
      if (r !== "ADMIN") localStorage.setItem(LAST_ROLE_KEY, r);
    } catch {}
  }
  const [mode, setMode] = React.useState<Mode>("password");
  const [mailReady, setMailReady] = React.useState<boolean | null>(null);
  const [availability, setAvailability] = React.useState<"idle" | "checking" | "free" | "taken">("idle");
  const { copied, copy } = useCopy();

  // Default to emailed invites when SMTP is configured.
  React.useEffect(() => {
    let live = true;
    emailInviteAvailable()
      .then((ok) => {
        if (!live) return;
        setMailReady(ok);
        if (ok) setMode("invite");
      })
      .catch(() => live && setMailReady(false));
    return () => {
      live = false;
    };
  }, []);

  // Check the email as they type (after a short pause).
  React.useEffect(() => {
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    let live = true;
    const t = setTimeout(() => {
      checkEmailAvailable(value)
        .then((free) => live && setAvailability(free ? "free" : "taken"))
        .catch(() => live && setAvailability("idle"));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [email]);

  const [state, formAction] = useActionState(
    async (prev: UserFormState, formData: FormData) => {
      const result = await createUserAccount(prev, formData);
      if (result.success) {
        setCreated({
          name: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim().toLowerCase(),
          password: String(formData.get("password") ?? ""),
          role: formData.get("role") === "ADMIN" ? "ADMIN" : "EDITOR",
          mode: formData.get("mode") === "invite" ? "invite" : "password",
          inviteLink: result.inviteLink,
          emailed: result.emailed,
        });
      }
      return result;
    },
    initialState
  );

  const pw = passwordStrength(password);
  const domain = email.split("@")[1]?.toLowerCase();
  const suggestion = domain && EMAIL_TYPOS[domain] ? `${email.split("@")[0]}@${EMAIL_TYPOS[domain]}` : null;
  const activeRole = ROLE_META[role];

  if (created) {
    const loginUrl = `${window.location.origin}/admin/login`;
    const first = created.name.split(" ")[0];
    const isInvite = created.mode === "invite";
    const invite = isInvite
      ? `Hi ${first},\n\nYou've been added to the admin dashboard as: ${ROLE_META[created.role].label}.\n\nChoose your password here (link valid for 72 hours):\n${created.inviteLink}`
      : `Hi ${first},\n\nYou've been added to the admin dashboard as: ${ROLE_META[created.role].label}.\n\nSign in: ${loginUrl}\nEmail: ${created.email}\nTemporary password: ${created.password}\n\nYou'll be asked to choose a new password when you sign in.`;
    const rows: [string, string, string][] = isInvite
      ? [["Email", created.email, "email"], ["Invite link", created.inviteLink ?? "", "link"]]
      : [["Email", created.email, "email"], ["Password", created.password, "password"]];
    return (
      <div className="space-y-5">
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </span>
          <DialogTitle>{created.name} has been added</DialogTitle>
          <DialogDescription>
            {isInvite
              ? created.emailed
                ? `We emailed an invite to ${created.email}. The link works for 72 hours.`
                : "Email isn't set up, so nothing was sent. Share the invite link below instead."
              : "This is the only time the password is shown. Send it to them now."}
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border rounded-xl border border-border text-sm">
          {rows.map(([label, value, key]) => (
            <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn("truncate font-medium", key === "password" && "font-mono")}>{value}</dd>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy ${label.toLowerCase()}`}
                onClick={() => copy(key, value)}
              >
                {copied === key ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
          ))}
        </dl>

        <Button type="button" className="w-full" onClick={() => copy("invite", invite)}>
          {copied === "invite" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied === "invite" ? "Copied" : "Copy invite message"}
        </Button>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onAnother}>
            <UserPlus className="size-4" />
            Add another
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add team member</DialogTitle>
        <DialogDescription>
          Create their account, pick what they can do, then share the sign-in details.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/10 font-medium text-primary">
              {initials(name) || <UserPlus className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-medium", !name && "text-muted-foreground")}>{name || "New team member"}</p>
            <p className="truncate text-sm text-muted-foreground">{email || "email@example.com"}</p>
          </div>
          <Badge variant={role === "ADMIN" ? "default" : "outline"}>{activeRole.label}</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="user-name" error={state.fieldErrors?.name}>
            <Input
              id="user-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder="Ama Mensah"
              required
            />
          </Field>
          <Field label="Email" htmlFor="user-email" error={state.fieldErrors?.email}>
            <Input
              id="user-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="ama@company.com"
              required
            />
            {availability === "checking" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Checking…
              </p>
            )}
            {availability === "taken" && (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                This email is already registered.
              </p>
            )}
            {availability === "free" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
                <Check className="size-3" /> Available
              </p>
            )}
            {suggestion && (
              <button
                type="button"
                onClick={() => setEmail(suggestion)}
                className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Did you mean <span className="font-medium underline underline-offset-2">{suggestion}</span>?
              </button>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Access level</legend>
          <input type="hidden" name="role" value={role} />
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Access level">
            {ROLES.map((value) => {
              const { label, tagline } = ROLE_META[value];
              const Icon = ROLE_ICON[value];
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickRole(value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/30"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium leading-tight">{label}</span>
                      <span className="block text-xs text-muted-foreground">{tagline}</span>
                    </span>
                  </span>
                  <ul className="mt-2.5 space-y-1">
                    {roleCan(value).map((c) => (
                      <li key={c} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className={cn("size-3 shrink-0", active ? "text-primary" : "text-muted-foreground/60")} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">How should they get access?</legend>
          <input type="hidden" name="mode" value={mode} />
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Access method">
            {([
              { value: "invite", label: "Email an invite", desc: "They choose their own password. Nothing to share.", icon: Mail },
              { value: "password", label: "Set a password", desc: "You share a temporary one. They must change it.", icon: KeyRound },
            ] as const).map(({ value, label, desc, icon: Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(value)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/30"
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {mode === "invite" && mailReady === false && (
            <p className="mt-2 text-xs text-muted-foreground">
              Email isn&apos;t set up on this site, so you&apos;ll get a link to share yourself.
            </p>
          )}
        </fieldset>

        {mode === "password" && (
          <Field
            label="Temporary password"
            htmlFor="user-password"
            error={state.fieldErrors?.password}
            hint="Generated for you (10+ characters). They must change it at first sign-in."
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="user-password"
                  name="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                  className="pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Generate new password"
                onClick={() => {
                  setPassword(generatePassword());
                  setShow(true);
                }}
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy password"
                disabled={!password}
                onClick={() => copy("pw", password)}
              >
                {copied === "pw" ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            {password && (
              <div className="mt-2 flex items-center gap-2" aria-live="polite">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn("h-1 flex-1 rounded-full bg-muted transition-colors", pw.score >= i && pw.color)}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{pw.label}</span>
              </div>
            )}
          </Field>
        )}

        {state.message && !state.success && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {state.message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton pendingText="Creating..." {...(availability === "taken" ? { disabled: true } : {})}>
            {mode === "invite" ? <Mail className="size-4" /> : <UserPlus className="size-4" />}
            {mode === "invite" ? "Send invite" : "Create"}
            {name.trim() ? ` for ${name.trim().split(" ")[0]}` : ""}
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
