"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Settings2,
  ShieldOff,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Field } from "@/components/admin/form-fields";
import { ConfirmAction } from "@/components/admin/confirm-action";
import {
  deleteUserAccount,
  resendInvite,
  resetUserPassword,
  resetUserTwoFactor,
  setUserDisabled,
  updateUserProfile,
} from "@/lib/actions/users";
import { generatePassword, passwordStrength } from "@/lib/password-utils";
import type { Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  totpEnabled: boolean;
  disabled: boolean;
  neverSignedIn: boolean;
  posts: number;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function UserManageSheet({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button type="button" variant="outline" size="sm" aria-label={`Manage ${user.name}`} />}
      >
        <Settings2 className="size-4" />
        Manage
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{user.name}</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>
        {open && <SheetBody user={user} onChanged={() => router.refresh()} onClose={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ user, onChanged, onClose }: { user: ManagedUser; onChanged: () => void; onClose: () => void }) {
  return (
    <div className="space-y-5 px-4 pb-6">
      <DetailsForm user={user} onChanged={onChanged} />
      {user.neverSignedIn && <InvitePanel user={user} />}
      <PasswordPanel user={user} onChanged={onChanged} />

      <Section title="Security" hint="Lost their phone? Turn 2FA off so they can sign in and set it up again.">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
          <span>Two-factor authentication: <strong>{user.totpEnabled ? "On" : "Off"}</strong></span>
          {user.totpEnabled && (
            <ConfirmAction
              label="Reset 2FA"
              icon={<ShieldOff className="size-4" />}
              title={`Reset two-factor for ${user.name}?`}
              description="Their authenticator and recovery codes stop working. They can sign in with just their password and set 2FA up again."
              confirmLabel="Reset 2FA"
              action={() => resetUserTwoFactor(user.id)}
              onDone={onChanged}
            />
          )}
        </div>
      </Section>

      <Section
        title={user.disabled ? "Account is deactivated" : "Deactivate"}
        hint={
          user.disabled
            ? "They can't sign in. Their content is kept."
            : "Blocks sign-in and ends their sessions. Their content is kept and you can undo this."
        }
      >
        {user.disabled ? (
          <ConfirmAction
            label="Reactivate"
            icon={<UserCheck className="size-4" />}
            title={`Reactivate ${user.name}?`}
            description="They will be able to sign in again with their existing password."
            confirmLabel="Reactivate"
            action={() => setUserDisabled(user.id, false)}
            onDone={onChanged}
          />
        ) : (
          <ConfirmAction
            label="Deactivate"
            icon={<Ban className="size-4" />}
            title={`Deactivate ${user.name}?`}
            description="They are signed out and can't sign in until you reactivate them. Nothing they created is deleted."
            confirmLabel="Deactivate"
            destructive
            action={() => setUserDisabled(user.id, true)}
            onDone={onChanged}
          />
        )}
      </Section>

      <Section title="Delete" hint="Permanent. Consider deactivating instead.">
        <ConfirmAction
          label="Delete user"
          icon={<Trash2 className="size-4" />}
          title={`Delete ${user.name}?`}
          description={
            <>
              This permanently removes the account and cannot be undone.{" "}
              {user.posts > 0
                ? `Their ${user.posts} post${user.posts === 1 ? "" : "s"} will stay on the site with no author.`
                : "They have no posts."}
            </>
          }
          confirmLabel="Delete permanently"
          destructive
          action={() => deleteUserAccount(user.id)}
          onDone={() => {
            onChanged();
            onClose();
          }}
        />
      </Section>
    </div>
  );
}

function DetailsForm({ user, onChanged }: { user: ManagedUser; onChanged: () => void }) {
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();
  const dirty = name.trim() !== user.name || email.trim().toLowerCase() !== user.email;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateUserProfile(user.id, { name, email });
      setErrors(res.fieldErrors ?? {});
      if (res.success) {
        toast.success(res.message);
        onChanged();
      } else if (!res.fieldErrors) {
        toast.error(res.message);
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Full name" htmlFor="edit-name" error={errors.name}>
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Email" htmlFor="edit-email" error={errors.email}>
        <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Button type="submit" disabled={!dirty || pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save details
      </Button>
    </form>
  );
}

function InvitePanel({ user }: { user: ManagedUser }) {
  const [pending, startTransition] = React.useTransition();
  const [link, setLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  function send() {
    startTransition(async () => {
      const res = await resendInvite(user.id);
      if (res.success) {
        toast.success(res.message);
        setLink(res.link ?? null);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Section title="Invite" hint="They haven't signed in yet. Send a fresh link (valid 72 hours).">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={send} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Resend invite
        </Button>
        {link && (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(link).catch(() => toast.error("Couldn't copy."));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            Copy invite link
          </Button>
        )}
      </div>
    </Section>
  );
}

function PasswordPanel({ user, onChanged }: { user: ManagedUser; onChanged: () => void }) {
  const [password, setPassword] = React.useState(() => generatePassword());
  const [show, setShow] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const pw = passwordStrength(password);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  return (
    <Section
      title="Reset password"
      hint="Sets a new temporary password, signs them out everywhere, and makes them choose their own next time."
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            aria-label="New temporary password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setDone(false);
            }}
            autoComplete="new-password"
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
            setDone(false);
          }}
        >
          <RefreshCw className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Copy password" onClick={copy}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <div className="flex items-center gap-2" aria-live="polite">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full bg-muted", pw.score >= i && pw.color)} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{pw.label}</span>
      </div>
      {done ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="size-4" />
          Password reset. Copy it above and send it to {user.name.split(" ")[0]}.
        </p>
      ) : (
        <ConfirmAction
          label="Reset password"
          icon={<KeyRound className="size-4" />}
          title={`Reset ${user.name}'s password?`}
          description="They are signed out everywhere and must choose a new password when they next sign in. Make sure you copy the new password first."
          confirmLabel="Reset password"
          action={() => resetUserPassword(user.id, password)}
          onDone={() => {
            setDone(true);
            setShow(true);
            onChanged();
          }}
        />
      )}
    </Section>
  );
}
