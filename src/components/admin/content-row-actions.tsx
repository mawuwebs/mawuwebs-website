import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrashButton } from "@/components/admin/trash-button";
import { RestoreButton } from "@/components/admin/restore-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { purgeItem, restoreItem, trashItem } from "@/lib/actions/lifecycle";

/** Edit / preview / trash for a content row; Restore / delete forever when viewing the trash. */
export function ContentRowActions({
  type,
  id,
  title,
  editHref,
  trashed,
  isAdmin,
}: {
  type: "post" | "page" | "project" | "service" | "plan";
  id: string;
  title: string;
  editHref: string;
  trashed: boolean;
  isAdmin: boolean;
}) {
  if (trashed) {
    return (
      <div className="flex items-center justify-end gap-1">
        <RestoreButton itemLabel={title} action={restoreItem.bind(null, type, id)} />
        {isAdmin && <DeleteButton itemLabel={title} action={purgeItem.bind(null, type, id)} />}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        render={<Link href={type === "plan" ? "/plans" : `/preview/${type}/${id}`} target="_blank" />}
        aria-label={`Preview ${title}`}
      >
        <Eye className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" render={<Link href={editHref} />} aria-label={`Edit ${title}`}>
        <Pencil className="size-4" />
      </Button>
      <TrashButton
        itemLabel={title}
        trash={trashItem.bind(null, type, id)}
        restore={restoreItem.bind(null, type, id)}
      />
    </div>
  );
}
