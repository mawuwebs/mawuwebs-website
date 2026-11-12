import Link from "next/link";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RestoreButton } from "@/components/admin/restore-button";
import { RestoreRevisionButton } from "@/components/admin/restore-revision-button";
import { restoreItem } from "@/lib/actions/lifecycle";
import { describeSnapshot, listRevisions, type EntityType } from "@/lib/revisions";

export function EditHeader({
  type,
  id,
  heading,
  title,
  trashed,
}: {
  type: EntityType;
  id: string;
  heading: string;
  title: string;
  trashed: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-muted-foreground">{title}</p>
        </div>
        <Link href={type === "plan" ? "/plans" : `/preview/${type}/${id}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Eye className="size-4" />
          {type === "plan" ? "View plans page" : "Preview"}
        </Link>
      </div>
      {trashed && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm">This item is in the trash and hidden from your site. Restore it to edit or publish it.</p>
          <RestoreButton itemLabel={title} action={restoreItem.bind(null, type, id)} />
        </div>
      )}
    </>
  );
}

/** Previous versions, saved automatically every time the item is edited. */
export async function RevisionHistory({ type, id }: { type: EntityType; id: string }) {
  const revisions = await listRevisions(type, id);
  return (
    <section aria-label="Version history" className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Version history</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each save keeps the previous version, up to 25. Restoring one is itself undoable.
      </p>
      {revisions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No earlier versions yet. They appear after the first edit.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {revisions.map((r) => {
            const when = format(r.createdAt, "MMM d, yyyy 'at' h:mm a");
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{when}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.authorName || "Unknown"} &middot; {describeSnapshot(r.snapshot)}
                    {r.label ? ` · ${r.label}` : ""}
                  </p>
                </div>
                <RestoreRevisionButton revisionId={r.id} when={when} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
