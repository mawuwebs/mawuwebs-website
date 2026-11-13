// Gated templates for /resources/it-toolkit. Plain data so they are easy to edit and print.

export type Template = { id: string; title: string; blurb: string; sections: { heading: string; items: string[] }[] };

export const TOOLKIT_COOKIE = "it_toolkit";

export const TEMPLATES: Template[] = [
  {
    id: "acceptable-use",
    title: "Acceptable use policy",
    blurb: "One page every employee signs. Adapt the bracketed parts to your business.",
    sections: [
      {
        heading: "Company equipment and accounts",
        items: [
          "Company computers, phones and accounts are for [Company] business. Limited personal use is allowed if it does not affect work or security.",
          "Do not install software that is not approved by [IT contact].",
          "Report a lost or stolen device to [IT contact] immediately, in any case within 24 hours.",
        ],
      },
      {
        heading: "Passwords and sign-in",
        items: [
          "Use a unique password for every work account. Use the company password manager.",
          "Turn on two-step sign-in wherever it is offered.",
          "Never share a password, including with IT. We will never ask for it.",
        ],
      },
      {
        heading: "Email and the internet",
        items: [
          "Do not click links or open attachments you did not expect. If unsure, forward the message to [IT contact].",
          "Do not send customer or financial data to personal email or messaging apps.",
        ],
      },
      {
        heading: "Leaving the company",
        items: ["All devices, files and access are returned or removed on the last working day."],
      },
      {
        heading: "Acknowledgement",
        items: ["I have read and agree to follow this policy.   Name: ____________   Date: ________   Signature: ____________"],
      },
    ],
  },
  {
    id: "backup-checklist",
    title: "Backup health checklist",
    blurb: "Run through this every quarter. Any 'no' is a gap to fix.",
    sections: [
      {
        heading: "Coverage",
        items: [
          "We have a written list of what must be backed up (files, email, databases, accounting).",
          "Staff laptops are backed up, not just the server.",
          "Cloud tools (email, shared drives) are backed up separately from the provider.",
        ],
      },
      {
        heading: "Copies",
        items: [
          "Backups run automatically, at least daily for critical data.",
          "At least one copy is off-site or in the cloud.",
          "At least one copy cannot be changed or deleted from a normal staff account.",
        ],
      },
      {
        heading: "Proof",
        items: [
          "Someone checks the backup report every week.",
          "A real file was restored in the last 3 months.",
          "We know how long a full restore would take, and the business can survive that wait.",
        ],
      },
    ],
  },
  {
    id: "incident-response",
    title: "Incident response one-pager",
    blurb: "Print it and keep it where people can find it when things go wrong.",
    sections: [
      {
        heading: "First 15 minutes",
        items: [
          "Stay calm. Do not delete anything and do not restart affected machines.",
          "Disconnect the affected device from Wi-Fi and the network cable.",
          "Call [IT contact] on [phone]. Tell them what you saw and when.",
        ],
      },
      {
        heading: "First hour (IT contact or manager)",
        items: [
          "Change passwords for affected accounts from a clean device, and sign out all sessions.",
          "Find out which systems and data may be involved.",
          "Preserve evidence: screenshots, email headers, times.",
        ],
      },
      {
        heading: "Within 72 hours",
        items: [
          "If personal data may have been exposed, decide whether the Data Protection Commission and affected people must be told.",
          "Tell customers and partners who are affected, with facts and what they should do.",
          "Restore from known-good backups and confirm the cause is closed.",
        ],
      },
      {
        heading: "Afterwards",
        items: ["Write down what happened, what worked and what to change. Update this page."],
      },
    ],
  },
];
