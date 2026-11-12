// Managed IT plans live in the database (admin: Plans). This file holds the shape and helpers.

export type Plan = {
  slug: string;
  name: string;
  tagline: string;
  forWho: string;
  features: string[];
  highlight?: boolean;
  price?: string;
};

export const TEAM_SIZES = ["1-5 people", "6-15 people", "16-50 people", "50+ people"] as const;

type PlanRow = {
  slug: string;
  name: string;
  tagline: string;
  forWho: string;
  features: string;
  highlight: boolean;
  price: string | null;
};

export function toPlan(row: PlanRow): Plan {
  let features: string[] = [];
  try {
    const parsed = JSON.parse(row.features);
    if (Array.isArray(parsed)) features = parsed.map(String);
  } catch {
    features = [];
  }
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    forWho: row.forWho,
    features,
    highlight: row.highlight,
    price: row.price || undefined,
  };
}

/** One feature per line in the admin textarea. */
export const featuresFromText = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30);
