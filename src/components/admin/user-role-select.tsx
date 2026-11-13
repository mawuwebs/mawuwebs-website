"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions/users";
import { ROLES, ROLE_META, type StaffRole as Role } from "@/lib/permissions";


export function UserRoleSelect({ userId, role, name }: { userId: string; role: Role; name: string }) {
  const [pending, startTransition] = React.useTransition();

  function change(next: Role) {
    if (next === role) return;
    startTransition(async () => {
      const res = await updateUserRole(userId, next);
      if (res.success) toast.success(`${name} is now ${ROLE_META[next].label.toLowerCase()}.`);
      else toast.error(res.message);
    });
  }

  return (
    <Select value={role} onValueChange={(v) => change((v as Role) ?? role)} disabled={pending}>
      <SelectTrigger size="sm" className="w-40" aria-label={`Role for ${name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_META[r].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
