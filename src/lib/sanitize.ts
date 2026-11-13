import sanitizeHtml from "sanitize-html";

/**
 * Cleans rich-text HTML written in the admin editor. Removes scripts, event handlers,
 * javascript: links and any iframe that is not a YouTube embed, so a lower-privilege
 * editor cannot run code in a visitor's or an admin's browser.
 */
export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "code", "pre",
      "blockquote", "ul", "ol", "li", "a", "img",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
      "div", "iframe",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      div: ["data-youtube-video"],
      iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "allow", "title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com"],
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") attribs.rel = "noopener noreferrer";
        else delete attribs.target;
        return { tagName, attribs };
      },
    },
  });
}

/** Safe to place inside <script type="application/ld+json">: "<" cannot close the tag. */
export function ldJson(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
