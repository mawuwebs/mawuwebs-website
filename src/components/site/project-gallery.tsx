"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

/** Gallery grid; click a screen to open a full-size viewer (Esc closes, arrows navigate). */
export function ProjectGallery({ title, images }: { title: string; images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => ref.current?.close(), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <>
      <div className={`mt-5 grid grid-cols-1 gap-5 ${images.length === 1 ? "" : images.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {images.map((src, i) => {
          const phone = /mobile/i.test(src);
          return (
            <button
              key={src}
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
              aria-label={`Enlarge ${title} screenshot ${i + 1}`}
              className={`group relative aspect-[4/3] overflow-hidden rounded-xl border border-border text-left ${phone ? "bg-forest" : "bg-secondary/50"}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className={`transition-transform duration-500 group-hover:scale-[1.03] ${phone ? "object-contain py-3" : "object-cover object-top"}`}
              />
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Maximize2 className="size-3.5" aria-hidden /> View
              </span>
            </button>
          );
        })}
      </div>

      <dialog
        ref={ref}
        aria-label={`${title} screenshots`}
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto h-[92vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl border-0 bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {open !== null && (
          <div className="relative h-full w-full">
            <Image src={images[open]} alt={`${title} screenshot ${open + 1}`} fill sizes="96vw" className="object-contain p-4 sm:p-10" />
            <button type="button" onClick={close} aria-label="Close" className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="size-5" />
            </button>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous screenshot" className="absolute top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next screenshot" className="absolute top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <ChevronRight className="size-6" />
                </button>
                <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs" aria-live="polite">
                  {open + 1} / {images.length}
                </p>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
