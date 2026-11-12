import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPageHeader({
  title,
  description,
  newHref,
  newLabel = "New",
}: {
  title: string;
  description?: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 flex flex-col items-start justify-between gap-4 duration-500 sm:flex-row sm:items-center">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {newHref && (
        <Button render={<Link href={newHref} />}>
          <Plus className="size-4" />
          {newLabel}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}
