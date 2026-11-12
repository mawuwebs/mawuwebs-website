import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { PublishToggle } from "@/components/admin/publish-toggle";

/** Status column shared by content lists: trash, scheduled, or the publish toggle. */
export function ContentStatusCell({
  status,
  scheduledAt,
  deletedAt,
  toggle,
}: {
  status: "DRAFT" | "PUBLISHED";
  scheduledAt: Date | null;
  deletedAt: Date | null;
  toggle: () => Promise<{ success: boolean; message: string }>;
}) {
  if (deletedAt) return <span className="text-sm text-muted-foreground">In trash</span>;
  if (status === "PUBLISHED" && scheduledAt && scheduledAt > new Date()) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
        <CalendarClock className="size-3" />
        {format(scheduledAt, "MMM d, h:mm a")}
      </span>
    );
  }
  return <PublishToggle status={status} action={toggle} />;
}
