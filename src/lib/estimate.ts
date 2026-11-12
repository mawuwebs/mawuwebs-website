// Scoring model for the /estimate wizard. Edit freely: nothing here is a price.
// Add a `price` string to a tier (e.g. "from X") once you want it shown.

export type Option = { id: string; label: string; hint?: string; points: number };

export const PROJECT_TYPES: Option[] = [
  { id: "website", label: "Business website", hint: "Present the business, get enquiries", points: 2 },
  { id: "store", label: "Online store", hint: "Sell products and take payment", points: 5 },
  { id: "webapp", label: "Web app or platform", hint: "Logins, dashboards, custom workflows", points: 7 },
  { id: "mobile", label: "Mobile app", hint: "iOS and Android", points: 6 },
  { id: "redesign", label: "Redesign of an existing site", hint: "Same job, better result", points: 3 },
  { id: "it", label: "IT support, networking, security or hardware", hint: "Scoped after a short chat, not by pages and features", points: 0 },
  { id: "unsure", label: "Not sure yet", hint: "We'll work it out together", points: 3 },
];

export const SIZES: Option[] = [
  { id: "s", label: "Small", hint: "Up to about 5 pages", points: 0 },
  { id: "m", label: "Medium", hint: "About 6 to 15 pages", points: 2 },
  { id: "l", label: "Large", hint: "More than 15 pages, or many content types", points: 4 },
];

export const FEATURES: Option[] = [
  { id: "cms", label: "Content you can edit yourself", points: 1 },
  { id: "blog", label: "Blog or news section", points: 1 },
  { id: "booking", label: "Online booking", points: 2 },
  { id: "payments", label: "Online payments", points: 3 },
  { id: "accounts", label: "User accounts / login", points: 3 },
  { id: "multilang", label: "More than one language", points: 2 },
  { id: "integrations", label: "Connect to other tools or systems", points: 2 },
];

export const TIMELINES: Option[] = [
  { id: "asap", label: "As soon as possible", points: 0 },
  { id: "soon", label: "Within 1 to 2 months", points: 0 },
  { id: "flex", label: "Flexible", points: 0 },
];

/** Project types that aren't sized by pages and features. They skip those steps. */
export const IT_TYPE = "it";

export const IT_TIER = {
  max: 0,
  name: "Needs a quick assessment",
  weeks: "Depends on the setup",
  summary:
    "IT support, networks, security and equipment are scoped by looking at what you have today. A short call or site visit is the fastest way to get an accurate plan and quote.",
} as const;

export const TIERS = [
  {
    max: 4,
    name: "Focused build",
    weeks: "2 to 4 weeks",
    summary: "A compact project with a clear job to do. Quick to scope, quick to ship.",
  },
  {
    max: 9,
    name: "Standard build",
    weeks: "4 to 8 weeks",
    summary: "A full site or store with several moving parts. Needs a proper scoping conversation.",
  },
  {
    max: Infinity,
    name: "Custom build",
    weeks: "8 weeks or more",
    summary: "A bigger system with real complexity. Best tackled in phases, starting with a scoping workshop.",
  },
] as const;

export function scoreEstimate(input: {
  type?: string;
  size?: string;
  features: string[];
}) {
  const pick = (list: Option[], id?: string) => list.find((o) => o.id === id)?.points ?? 0;
  const score =
    pick(PROJECT_TYPES, input.type) +
    pick(SIZES, input.size) +
    input.features.reduce((sum, f) => sum + pick(FEATURES, f), 0);
  if (input.type === IT_TYPE) return { score, tier: IT_TIER };
  return { score, tier: TIERS.find((t) => score <= t.max) ?? TIERS[TIERS.length - 1] };
}
