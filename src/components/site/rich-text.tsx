import { cn } from "@/lib/utils";
import { cleanHtml } from "@/lib/sanitize";

export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("prose-content", className)}
      // Sanitized: authored by CMS users, but lower-privilege roles must not be able to inject scripts.
      dangerouslySetInnerHTML={{ __html: cleanHtml(html).replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"') }}
    />
  );
}
