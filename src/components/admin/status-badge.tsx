import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "PUBLISHED"
          ? "border-success/30 bg-success/10 text-success"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
    >
      {status === "PUBLISHED" ? "Published" : "Draft"}
    </Badge>
  );
}
