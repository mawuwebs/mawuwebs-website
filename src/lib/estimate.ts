// Scoring model for the /estimate wizard. The live copy is edited in the admin (Forms & estimates);
// the values below are the defaults used until it is saved. Nothing here is a price.

export type Option = { id: string; label: string; hint?: string; points: number };
export type Tier = { max: number | null; name: string; weeks: string; summary: string };
export type EstimateConfig = {
  types: Option[];
  sizes: Option[];
  features: Option[];
  timelines: Option[];
  /** Ordered by `max` ascending; the last one has max null (no upper limit). */
  tiers: Tier[];
  /** Shown instead of a tier for the IT project type, which isn't sized by pages and features. */
  itTier: { name: string; weeks: string; summary: string };
};

/** Project type that skips the size and feature steps. */
export const IT_TYPE = "it";

export const DEFAULT_ESTIMATE: EstimateConfig = {
  types: [
  { id: "website", label: "Business website", hint: "Present the business, get enquiries", points: 2 },
  { id: "store", label: "Online store", hint: "Sell products and take payment", points: 5 },
  { id: "webapp", label: "Web app or platform", hint: "Logins, dashboards, custom workflows", points: 7 },
  { id: "mobile", label: "Mobile app", hint: "iOS and Android", points: 6 },
  { id: "redesign", label: "Redesign of an existing site", hint: "Same job, better result", points: 3 },
  { id: "it", label: "IT support, networking, security or hardware", hint: "Scoped after a short chat, not by pages and features", points: 0 },
  { id: "unsure", label: "Not sure yet", hint: "We'll work it out together", points: 3 },
],
  sizes: [
  { id: "s", label: "Small", hint: "Up to about 5 pages", points: 0 },
  { id: "m", label: "Medium", hint: "About 6 to 15 pages", points: 2 },
  { id: "l", label: "Large", hint: "More than 15 pages, or many content types", points: 4 },
],
  features: [
  { id: "cms", label: "Content you can edit yourself", points: 1 },
  { id: "blog", label: "Blog or news section", points: 1 },
  { id: "booking", label: "Online booking", points: 2 },
  { id: "payments", label: "Online payments", points: 3 },
  { id: "accounts", label: "User accounts / login", points: 3 },
  { id: "multilang", label: "More than one language", points: 2 },
  { id: "integrations", label: "Connect to other tools or systems", points: 2 },
],
  timelines: [
  { id: "asap", label: "As soon as possible", points: 0 },
  { id: "soon", label: "Within 1 to 2 months", points: 0 },
  { id: "flex", label: "Flexible", points: 0 },
],
  tiers: [
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
    max: null,
    name: "Custom build",
    weeks: "8 weeks or more",
    summary: "A bigger system with real complexity. Best tackled in phases, starting with a scoping workshop.",
  },
],
  itTier: {
  name: "Needs a quick assessment",
  weeks: "Depends on the setup",
  summary:
    "IT support, networks, security and equipment are scoped by looking at what you have today. A short call or site visit is the fastest way to get an accurate plan and quote.",
},
};

export function scoreEstimate(
  input: { type?: string; size?: string; features: string[] },
  config: EstimateConfig = DEFAULT_ESTIMATE
) {
  const pick = (list: Option[], id?: string) => list.find((o) => o.id === id)?.points ?? 0;
  const score =
    pick(config.types, input.type) +
    pick(config.sizes, input.size) +
    input.features.reduce((sum, f) => sum + pick(config.features, f), 0);
  if (input.type === IT_TYPE) return { score, tier: config.itTier };
  const tier = config.tiers.find((t) => t.max === null || score <= t.max) ?? config.tiers[config.tiers.length - 1];
  return { score, tier };
}
