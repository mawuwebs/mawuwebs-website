"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { uploadMedia } from "@/lib/actions/media";
import { toast } from "sonner";

export function GalleryField({
  name = "gallery",
  defaultValue = [],
}: {
  name?: string;
  defaultValue?: string[];
}) {
  const [images, setImages] = React.useState<string[]>(defaultValue);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadMedia({ success: false, message: "" }, formData);
        if (result.success && result.url) {
          setImages((prev) => [...prev, result.url!]);
        } else {
          toast.error(result.message);
        }
      }
    });
  }

  return (
    <div>
      <Label>Gallery images</Label>
      <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src + i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
            <input type="hidden" name={name} value={src} />
            <Image src={src} alt="" fill sizes="150px" className="object-cover" />
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
