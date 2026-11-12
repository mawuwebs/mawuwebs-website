// Options on the /support form. The live copy is edited in the admin (Forms & estimates);
// these are the defaults used until it is saved.

export type SupportConfig = {
  issues: string[];
  /** `urgent` marks the level that flags a request as work-stopping in the admin and in the email subject. */
  urgency: { label: string; urgent: boolean }[];
};

export const DEFAULT_SUPPORT: SupportConfig = {
  issues: [
    "Computer or laptop",
    "Email or accounts",
    "Internet, network or Wi-Fi",
    "Printer or other device",
    "Software or system",
    "Security concern (virus, hacked account)",
    "Something else",
  ],
  urgency: [
    { label: "Can wait a few days", urgent: false },
    { label: "Need help today", urgent: false },
    { label: "Urgent: work has stopped", urgent: true },
  ],
};
