"use client";

import * as React from "react";
import Image from "next/image";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteMedia } from "@/lib/actions/media";
import type { MediaModel } from "@/generated/prisma/models";

export function MediaCard({ media, usedIn = [] }: { media: MediaModel; usedIn?: string[] }) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMedia(media.id, usedIn.length > 0);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.origin + media.url);
    toast.success("URL copied to clipboard.");
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
      <Image src={media.url} alt={media.alt} fill sizes="200px" className="object-cover" />
      {usedIn.length > 0 && (
        <span
          title={usedIn.join("\n")}
          className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white"
        >
          Used in {usedIn.length}
        </span>
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100 max-sm:items-end max-sm:justify-end max-sm:bg-transparent max-sm:p-2">
        <Button type="button" size="icon-sm" variant="secondary" onClick={copyUrl} aria-label="Copy URL">
          <Copy className="size-4" />
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={<Button type="button" size="icon-sm" variant="destructive" aria-label="Delete image" />}
          >
            <Trash2 className="size-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
              <AlertDialogDescription>
                {usedIn.length > 0
                  ? `This image is used in ${usedIn.length} place${usedIn.length === 1 ? "" : "s"} (${usedIn.slice(0, 4).join(", ")}${usedIn.length > 4 ? "…" : ""}). Deleting it will leave broken images there.`
                  : "This will permanently remove the file. It is not used anywhere on the site."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={pending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
