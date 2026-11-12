// Managed IT plans shown on /plans. Edit this file to match what you really offer.
// Prices are intentionally left out: add a `price` string (e.g. "From GHS 500 / month")
// to a plan when you're ready to publish one, and it will appear on the card.

export type Plan = {
  name: string;
  tagline: string;
  forWho: string;
  features: string[];
  highlight?: boolean;
  price?: string;
};

export const PLANS: Plan[] = [
  {
    name: "Essential",
    tagline: "A safety net for small teams",
    forWho: "Small offices that mostly need someone to call when things go wrong.",
    features: [
      "Remote help desk for staff",
      "Email and account support",
      "Antivirus and update management",
      "Phone and WhatsApp support during business hours",
      "Pay-as-you-go on-site visits",
    ],
  },
  {
    name: "Standard",
    tagline: "Proactive care, fewer surprises",
    forWho: "Growing businesses that want problems caught before they stop work.",
    highlight: true,
    features: [
      "Everything in Essential",
      "Monitoring of computers, network and servers",
      "Scheduled on-site visits",
      "Backup management with restore checks",
      "Security reviews and staff guidance",
      "Priority response",
    ],
  },
  {
    name: "Premium",
    tagline: "IT handled end to end",
    forWho: "Businesses where downtime is costly and IT needs a dedicated owner.",
    features: [
      "Everything in Standard",
      "Named technician and account contact",
      "Extended-hours and emergency support",
      "IT planning, budgeting and vendor management",
      "New staff and equipment onboarding",
      "Regular reporting",
    ],
  },
];
