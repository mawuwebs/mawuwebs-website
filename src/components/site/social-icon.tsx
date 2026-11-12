import { Link as LinkIcon } from "lucide-react";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function LinkedinGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.15 1.45-2.15 2.94v5.66H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function TwitterGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 3H21l-6.6 7.54L22.2 21h-6.14l-4.8-6.27L5.7 21H3.58l7.06-8.07L2.7 3h6.3l4.34 5.74L18.9 3zm-1.08 16.17h1.17L7.24 4.75H5.98l11.84 14.42z" />
    </svg>
  );
}

function GithubGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.19-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2z"
      />
    </svg>
  );
}

function InstagramGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 9.5V7.8c0-.83.55-1.03 1.02-1.03H16V3.98L13.53 3.9c-2.63 0-3.5 1.65-3.5 4.16v1.44H8v3h2v9h4v-9h2.6l.4-3H14z" />
    </svg>
  );
}

function YoutubeGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.6 7.2s-.21-1.5-.87-2.16c-.83-.87-1.76-.87-2.19-.92C15.44 4 12 4 12 4h-.01s-3.43 0-6.53.12c-.43.05-1.36.05-2.19.92-.66.66-.87 2.16-.87 2.16S2.18 8.95 2.18 10.7v1.6c0 1.75.21 3.5.21 3.5s.21 1.5.87 2.16c.83.87 1.92.84 2.4.94C7.5 19 12 19 12 19s3.44 0 6.54-.13c.43-.05 1.36-.05 2.19-.92.66-.66.87-2.16.87-2.16s.21-1.75.21-3.5v-1.6c0-1.75-.21-3.5-.21-3.5zM9.98 14.5v-5.4l5.2 2.7-5.2 2.7z" />
    </svg>
  );
}

const SOCIAL_GLYPHS: Record<string, (props: IconProps) => React.JSX.Element> = {
  linkedin: LinkedinGlyph,
  twitter: TwitterGlyph,
  x: TwitterGlyph,
  github: GithubGlyph,
  instagram: InstagramGlyph,
  facebook: FacebookGlyph,
  youtube: YoutubeGlyph,
};

export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Glyph = SOCIAL_GLYPHS[platform.toLowerCase()];
  if (!Glyph) return <LinkIcon className={className} aria-hidden="true" />;
  return <Glyph className={className} />;
}
