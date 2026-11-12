import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";

function toLocalInput(d: Date) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** "Publish at" picker. A future time on a published item keeps it hidden until then. */
export function ScheduleField({ defaultValue, error }: { defaultValue?: Date | null; error?: string }) {
  return (
    <Field
      label="Publish at"
      htmlFor="field-scheduledAt"
      error={error}
      hint="Optional. Pick a future date and time to schedule a published item; leave empty to publish immediately."
    >
      <Input
        id="field-scheduledAt"
        name="scheduledAt"
        type="datetime-local"
        defaultValue={defaultValue ? toLocalInput(defaultValue) : ""}
      />
    </Field>
  );
}
