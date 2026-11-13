/** Client-safe helpers for admin password fields. */

export function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function passwordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "" };
  if (pw.length < 10) return { score: 1, label: "Too short", color: "bg-destructive" };
  let score = 1;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-destructive", "bg-amber-500", "bg-success", "bg-success"];
  return { score, label: labels[score], color: colors[score] };
}
