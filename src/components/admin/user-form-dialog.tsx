"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { createUserAccount, type UserFormState } from "@/lib/actions/settings";

const initialState: UserFormState = { success: false, message: "" };

export function UserFormDialog() {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(createUserAccount, initialState);
  const [role, setRole] = React.useState<"ADMIN" | "EDITOR">("EDITOR");

  // Closes the dialog once the server action reports success.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        New User
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Create a new admin or editor account for your team.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <Field label="Name" htmlFor="user-name" error={state.fieldErrors?.name}>
            <Input id="user-name" name="name" required />
          </Field>
          <Field label="Email" htmlFor="user-email" error={state.fieldErrors?.email}>
            <Input id="user-email" name="email" type="email" required />
          </Field>
          <Field label="Password" htmlFor="user-password" error={state.fieldErrors?.password}>
            <Input id="user-password" name="password" type="password" minLength={8} required />
          </Field>
          <div>
            <Label htmlFor="user-role">Role</Label>
            <input type="hidden" name="role" value={role} />
            <Select value={role} onValueChange={(v) => setRole((v as "ADMIN" | "EDITOR") ?? role)}>
              <SelectTrigger id="user-role" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Admins have full access, including user management. Editors can manage content only.
            </p>
          </div>

          {state.message && !state.success && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {state.message}
            </p>
          )}

          <SubmitButton className="w-full">Create user</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
