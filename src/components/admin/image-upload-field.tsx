"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMedia } from "@/lib/actions/media";
import { toast } from "sonner";

export function ImageUploadField({
  label = "Featured image",
  name,
  defaultValue,
}: {
  label?: string;
  name: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadMedia({ success: false, message: "" }, formData);
      if (result.success && result.url) {
        setValue(result.url);
        toast.success("Image uploaded");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div>
      <Label htmlFor={`${name}-url`}>{label}</Label>
      <input type="hidden" name={name} value={value} />

      <div className="mt-2 flex items-start gap-4">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
          {value ? (
            <Image src={value} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload image
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setValue("")}
              >
                <X className="size-4" />
                Remove
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <Input
            id={`${name}-url`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Or paste an image URL"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
