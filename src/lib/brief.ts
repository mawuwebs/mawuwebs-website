export const BRIEF_TYPE_GROUPS = [
  {
    label: "Websites & software",
    types: [
      "New website",
      "Online store",
      "Web app or platform",
      "Mobile app",
      "Redesign of an existing site",
    ],
  },
  {
    label: "IT & infrastructure",
    types: [
      "IT support or managed services",
      "Networking & Wi-Fi",
      "Cybersecurity",
      "Hardware & equipment",
      "Backup & recovery",
      "IT consulting or training",
    ],
  },
  { label: "Other", types: ["Not sure yet"] },
] as const;

export const BRIEF_TYPES = [
  "New website",
  "Online store",
  "Web app or platform",
  "Mobile app",
  "Redesign of an existing site",
  "IT support or managed services",
  "Networking & Wi-Fi",
  "Cybersecurity",
  "Hardware & equipment",
  "Backup & recovery",
  "IT consulting or training",
  "Not sure yet",
] as const;

export const BRIEF_TIMELINES = [
  "As soon as possible",
  "Within 1 to 2 months",
  "Within 3 to 6 months",
  "Flexible",
] as const;

export const TYPE_HINTS: Record<(typeof BRIEF_TYPES)[number], string> = {
  "New website": "Present your business and get enquiries",
  "Online store": "Sell products and take payment",
  "Web app or platform": "Logins, dashboards, custom workflows",
  "Mobile app": "iOS and Android apps",
  "Redesign of an existing site": "Same job, better result",
  "IT support or managed services": "Help desk, updates and on-site care",
  "Networking & Wi-Fi": "Office network, cabling, servers",
  Cybersecurity: "Protect devices, accounts and data",
  "Hardware & equipment": "Computers, printers and setup",
  "Backup & recovery": "Never lose your data",
  "IT consulting or training": "Advice, planning and staff training",
  "Not sure yet": "We'll work it out together",
};

export const TIMELINE_HINTS: Record<(typeof BRIEF_TIMELINES)[number], string> = {
  "As soon as possible": "There's a deadline or an opportunity",
  "Within 1 to 2 months": "Soon, but with room to do it properly",
  "Within 3 to 6 months": "Planning ahead",
  Flexible: "Quality matters more than speed",
};

/** Maps a service slug to the matching brief type, used to preselect it on /start-a-project. */
export const SERVICE_SLUG_TO_BRIEF_TYPE: Record<string, (typeof BRIEF_TYPES)[number]> = {
  "web-development": "New website",
  "ui-ux-design": "Redesign of an existing site",
  "e-commerce-solutions": "Online store",
  "cloud-devops": "Web app or platform",
  "seo-digital-marketing": "New website",
  "mobile-app-development": "Mobile app",
  "it-support-managed-services": "IT support or managed services",
  "networking-infrastructure": "Networking & Wi-Fi",
  cybersecurity: "Cybersecurity",
  "hardware-equipment": "Hardware & equipment",
  "backup-disaster-recovery": "Backup & recovery",
  "it-consulting-training": "IT consulting or training",
};
