import { toSlug } from "@/lib/slug";

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Adds ids to h2/h3 in stored HTML and returns the outline. */
export function withToc(html: string): { html: string; items: TocItem[] } {
  const items: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = toSlug(text) || `section-${items.length + 1}`;
    while (used.has(id)) id += "-2";
    used.add(id);
    items.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl}${attrs.replace(/\sid="[^"]*"/, "")} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, items };
}
