"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { SocialIcon } from "@/components/site/social-icon";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const shareLinks = [
    {
      platform: "x",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      platform: "linkedin",
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      platform: "facebook",
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — the link is still visible/selectable in the URL bar.
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Share</span>
      {shareLinks.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-forest hover:text-white"
        >
          <SocialIcon platform={link.platform} className="size-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-forest hover:text-white"
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
