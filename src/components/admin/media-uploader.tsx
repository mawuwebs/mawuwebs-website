"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadMedia } from "@/lib/actions/media";

export function MediaUploader() {
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    startTransition(async () => {
      let successCount = 0;
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadMedia({ success: false, message: "" }, formData);
        if (result.success) successCount++;
        else toast.error(result.message);
      }
      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} file${successCount === 1 ? "" : "s"}.`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Upload files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}
