"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/admin/submit-button";
import type { TaxonomyState } from "@/lib/actions/taxonomy";

const initialState: TaxonomyState = { success: false, message: "" };

export function AddTaxonomyForm({
  action,
  placeholder,
  hiddenFields,
}: {
  action: (prev: TaxonomyState, formData: FormData) => Promise<TaxonomyState>;
  placeholder: string;
  hiddenFields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <Input name="name" placeholder={placeholder} required className="h-9" />
      <SubmitButton size="sm" pendingText="Adding...">
        <Plus className="size-4" />
        Add
      </SubmitButton>
    </form>
  );
}
