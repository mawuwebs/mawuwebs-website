import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    name: settings.siteName,
    short_name: settings.siteName,
    description: settings.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b1642",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
