"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadMedia } from "@/lib/actions/media";
import {
  listLinkTargets,
  listMediaForPicker,
  type LinkTarget,
  type PickerMedia,
} from "@/lib/actions/editor";

export type LinkValue = { href: string; newTab: boolean };

export function LinkDialog({
  open,
  onOpenChange,
  initial,
  onApply,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: LinkValue;
  onApply: (v: LinkValue) => void;
  onRemove: () => void;
}) {
  const [targets, setTargets] = React.useState<LinkTarget[] | null>(null);
  const [href, setHref] = React.useState(initial.href);
  const [newTab, setNewTab] = React.useState(initial.newTab);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setHref(initial.href);
      setNewTab(initial.newTab);
      setQ("");
      if (!targets) listLinkTargets().then(setTargets).catch(() => setTargets([]));
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = (targets ?? [])
    .filter((t) => !q || t.label.toLowerCase().includes(q.toLowerCase()) || t.url.includes(q.toLowerCase()))
    .slice(0, 30);

  function pick(url: string) {
    setHref(url);
    setNewTab(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
          <DialogDescription>Search your site, or paste any URL.</DialogDescription>
        </DialogHeader>

        <Input placeholder="Search pages, services, posts..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
          {targets === null ? (
            <p className="p-3 text-sm text-muted-foreground">Loading...</p>
          ) : matches.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            matches.map((t) => (
              <button
                key={t.url}
                type="button"
                onClick={() => pick(t.url)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{t.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{t.group}</span>
              </button>
            ))
          )}
        </div>

        <div>
          <Label htmlFor="link-href">URL</Label>
          <Input
            id="link-href"
            className="mt-1.5"
            placeholder="/services/web-development or https://..."
            value={href}
            onChange={(e) => setHref(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} className="size-4 rounded border-input" />
          Open in a new tab
        </label>

        <DialogFooter>
          {initial.href && (
            <Button type="button" variant="ghost" onClick={() => { onRemove(); onOpenChange(false); }}>
              Remove link
            </Button>
          )}
          <Button
            type="button"
            disabled={!href.trim()}
            onClick={() => {
              onApply({ href: href.trim(), newTab });
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (m: { url: string; alt: string }) => void;
}) {
  const [items, setItems] = React.useState<PickerMedia[] | null>(null);
  const [selected, setSelected] = React.useState<PickerMedia | null>(null);
  const [alt, setAlt] = React.useState("");
  const [uploading, startUpload] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(() => {
    listMediaForPicker().then(setItems).catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setSelected(null);
      setAlt("");
      load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, load]);

  function upload(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const res = await uploadMedia({ success: false, message: "" }, fd);
      if (res.success) {
        toast.success("Uploaded");
        load();
      } else toast.error(res.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>Choose from the media library or upload a new image.</DialogDescription>
        </DialogHeader>

        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload new
          </Button>
        </div>

        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {items === null && <p className="col-span-full text-sm text-muted-foreground">Loading...</p>}
          {items?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No images yet.</p>}
          {items?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelected(m); setAlt(m.alt); }}
              className={`aspect-square overflow-hidden rounded-lg border-2 ${selected?.id === m.id ? "border-primary" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt} className="size-full object-cover" />
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="img-alt">Alt text (describes the image for accessibility and SEO)</Label>
          <Input id="img-alt" className="mt-1.5" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onPick({ url: selected.url, alt });
              onOpenChange(false);
            }}
          >
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
