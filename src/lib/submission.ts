import type { SubmissionStatusValue } from "@/lib/actions/messages";

export const STATUS_OPTIONS: { value: SubmissionStatusValue; label: string; style: string }[] = [
  { value: "NEW", label: "New", style: "border-accent/30 bg-accent/10 text-accent" },
  { value: "READ", label: "Read", style: "border-muted-foreground/30 bg-muted text-muted-foreground" },
  { value: "RESPONDED", label: "Replied", style: "border-success/30 bg-success/10 text-success" },
  { value: "QUOTED", label: "Quoted", style: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "WON", label: "Won", style: "border-success/40 bg-success/15 text-success" },
  { value: "LOST", label: "Lost", style: "border-destructive/30 bg-destructive/10 text-destructive" },
];

export function statusLabel(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export type SubmissionKind = "brief" | "estimate" | "support" | "plan" | "message";

export function submissionKind(subject: string): SubmissionKind {
  if (subject === "Project brief") return "brief";
  if (subject === "Project estimate") return "estimate";
  if (subject === "Support request") return "support";
  if (subject.startsWith("Plan enquiry:")) return "plan";
  return "message";
}

export const KIND_VALUES: SubmissionKind[] = ["support", "plan", "brief", "estimate", "message"];

/** Prefer the stored `kind` column; fall back to the legacy subject sniffing. */
export function kindOf(s: { kind?: string | null; subject: string }): SubmissionKind {
  return (KIND_VALUES as string[]).includes(s.kind ?? "") && s.kind !== "message"
    ? (s.kind as SubmissionKind)
    : submissionKind(s.subject);
}

/** Support requests the visitor marked as work-stopping (a flag set when the form is submitted). */
export function isUrgent(s: { urgent?: boolean | null }) {
  return Boolean(s.urgent);
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export const KIND_LABEL: Record<SubmissionKind, string> = {
  brief: "Project brief",
  estimate: "Estimate",
  support: "Support request",
  plan: "Plan enquiry",
  message: "Message",
};

/** Splits "Key: value" header lines (briefs and estimates) from the free-text body. */
export function parseSubmission(message: string) {
  const lines = message.split("\n");
  const fields: { key: string; value: string }[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][A-Za-z ]{1,40}): (.+)$/);
    if (!m) break;
    fields.push({ key: m[1], value: m[2] });
  }
  const body = lines.slice(i).join("\n").replace(/^\s*(About the project:|Notes:)\s*/i, "").trim();
  return { fields, body, structured: fields.length >= 2 };
}
