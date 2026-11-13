import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/preview", "/portal"] },
      // AI search and answer crawlers are welcome on public pages.
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: ["/admin", "/api", "/preview", "/portal"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
