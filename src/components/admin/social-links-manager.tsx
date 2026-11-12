"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteButton } from "@/components/admin/delete-button";
import { SocialIcon } from "@/components/site/social-icon";
import { createSocialLink, deleteSocialLink } from "@/lib/actions/settings";
import type { SocialLinkModel } from "@/generated/prisma/models";

const PLATFORMS = ["LinkedIn", "Twitter", "Instagram", "Facebook", "GitHub", "YouTube"];

// Rendered inside the larger Site Settings <form>, so this can't be a nested
// <form> of its own — the add-link action is triggered imperatively instead.
export function SocialLinksManager({ links }: { links: SocialLinkModel[] }) {
  const [platform, setPlatform] = React.useState("LinkedIn");
  const [url, setUrl] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function handleAdd() {
    if (!url.trim()) {
      toast.error("Enter a URL.");
      return;
    }
    const formData = new FormData();
    formData.append("platform", platform);
    formData.append("url", url.trim());
    startTransition(async () => {
      const result = await createSocialLink({ success: false, message: "" }, formData);
      if (result.success) {
        toast.success(result.message);
        setUrl("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div className="flex items-center gap-3 text-sm">
              <SocialIcon platform={link.platform} className="size-4 text-muted-foreground" />
              <span className="font-medium">{link.platform}</span>
              <span className="max-w-xs truncate text-muted-foreground">{link.url}</span>
            </div>
            <DeleteButton itemLabel={link.platform} action={deleteSocialLink.bind(null, link.id)} />
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground">No social links added yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={platform} onValueChange={(v) => setPlatform(v ?? platform)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          placeholder="https://"
          className="flex-1"
        />
        <Button type="button" onClick={handleAdd} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}
