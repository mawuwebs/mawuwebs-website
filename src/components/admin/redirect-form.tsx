"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";
import { createRedirect, type RedirectFormState } from "@/lib/actions/redirects";

const initial: RedirectFormState = { success: false, message: "" };

export function RedirectForm() {
  const [state, action] = useActionState(createRedirect, initial);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid items-end gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-[1fr_1fr_auto_auto]">
      <Field label="Old URL" htmlFor="field-fromPath" hint="e.g. /old-page">
        <Input id="field-fromPath" name="fromPath" placeholder="/old-page" required />
      </Field>
      <Field label="New URL" htmlFor="field-toPath" hint="Path or full https:// URL">
        <Input id="field-toPath" name="toPath" placeholder="/new-page" required />
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="hidden" name="permanent" value="off" />
        <input
          type="checkbox"
          defaultChecked
          onChange={(e) => {
            const h = e.currentTarget.previousElementSibling as HTMLInputElement;
            h.value = e.currentTarget.checked ? "on" : "off";
          }}
          className="size-4 rounded border-input"
        />
        Permanent
      </label>
      <SubmitButton>Add redirect</SubmitButton>
    </form>
  );
}
