import Script from "next/script";

/** Loads Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. Cookie-free. */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      defer
      data-domain={domain}
      src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js"}
      strategy="afterInteractive"
    />
  );
}
