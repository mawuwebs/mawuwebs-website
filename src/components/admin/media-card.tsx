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

export function MediaCard({ media }: { media: MediaModel }) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMedia(media.id);
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
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
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
                This will permanently remove the file. Any content still referencing it will show a broken image.
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
