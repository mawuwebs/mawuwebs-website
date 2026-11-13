// Plain constants shared by server and client code. Keep imports out of this file.
export const TICKET_STATUS_LABEL = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting for you",
  RESOLVED: "Resolved",
} as const;

export const ASSET_TYPES = ["Device", "Server", "Network equipment", "Software licence", "Domain", "Hosting", "Other"] as const;
export const DOC_KINDS = ["report", "invoice", "contract", "other"] as const;

export const ticketRef = (id: string) => `T-${id.slice(-6).toUpperCase()}`;
export const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const daysFromNow = (n: number) => new Date(Date.now() + n * 86400_000);
