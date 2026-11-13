/** Phone helpers. Numbers are stored as typed; these build links. Local numbers (0XX...) are assumed Ghana (+233). */

const DEFAULT_CC = "233";

/** International digits without "+", or null when the input is not a plausible number. */
export function intlDigits(raw: string, cc = DEFAULT_CC): string | null {
  const t = raw.trim();
  if (!t) return null;
  const plus = t.startsWith("+");
  let d = t.replace(/\D/g, "");
  if (!plus) {
    if (d.startsWith("00")) d = d.slice(2);
    else if (d.startsWith("0")) d = cc + d.slice(1);
    else if (d.length === 9) d = cc + d; // Ghana mobile typed without the leading 0
  }
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export const telHref = (raw: string) => {
  const d = intlDigits(raw);
  return d ? `tel:+${d}` : null;
};

export const whatsappHref = (raw: string) => {
  const d = intlDigits(raw);
  return d ? `https://wa.me/${d}` : null;
};

/** Accepts blank or a plausible number (digits, spaces, + - ( )). */
export const isValidPhone = (raw: string) => raw.trim() === "" || (/^[+\d][\d\s().-]{5,24}$/.test(raw.trim()) && intlDigits(raw) !== null);

/** Adds https:// when missing; null when it is not a usable web address. */
export function normalizeWebsite(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}
