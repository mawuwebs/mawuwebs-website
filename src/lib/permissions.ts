/** Role presets. Pure data so both server and client code can import it. */

export type StaffRole = "ADMIN" | "EDITOR" | "CONTENT" | "SUPPORT";
/** CLIENT users only ever see the customer portal, never the admin dashboard. */
export type Role = StaffRole | "CLIENT";
export type Area = "content" | "orders" | "billing" | "newsletter" | "settings" | "activity";

export const ROLES: StaffRole[] = ["EDITOR", "CONTENT", "SUPPORT", "ADMIN"];

export const AREA_LABEL: Record<Area, string> = {
  content: "Content: pages, services, plans, projects, posts, FAQs, media",
  orders: "Orders and messages",
  billing: "Quotes, invoices and payments",
  newsletter: "Newsletter",
  settings: "Site settings",
  activity: "Activity log",
};

export const ROLE_META: Record<StaffRole, { label: string; tagline: string; areas: Area[]; extra?: string[] }> = {
  EDITOR: {
    label: "Editor",
    tagline: "Content, orders, billing and newsletter",
    areas: ["content", "orders", "billing", "newsletter", "settings", "activity"],
  },
  CONTENT: {
    label: "Content editor",
    tagline: "Website content only",
    areas: ["content"],
  },
  SUPPORT: {
    label: "Support",
    tagline: "Orders and messages only",
    areas: ["orders"],
  },
  ADMIN: {
    label: "Admin",
    tagline: "Full control",
    areas: ["content", "orders", "billing", "newsletter", "settings", "activity"],
    extra: ["Add and remove users", "Forms and estimates", "Delete content"],
  },
};

export function can(role: Role | undefined, area: Area) {
  return !!role && role !== "CLIENT" && ROLE_META[role].areas.includes(area);
}

export function roleLabel(role: Role) {
  return role === "CLIENT" ? "Client" : ROLE_META[role].label;
}
