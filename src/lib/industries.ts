// Content for /it-for/[industry]. Plain data: edit freely, add an entry to add a page.

export type Industry = {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  pains: { title: string; body: string }[];
  /** Service slugs, shown only when that service is live. */
  services: string[];
  note: string;
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "schools",
    name: "Schools",
    headline: "IT that keeps classrooms running",
    intro: "Shared computers, student devices, Wi-Fi in every building and a small budget. We keep it working and keep it safe.",
    pains: [
      { title: "Shared and student devices", body: "Labs and tablets get misused, infected and broken. We lock them down, image them and keep them updated." },
      { title: "Wi-Fi that cannot cope", body: "Hundreds of devices on one network. We design coverage and separate staff, student and guest access." },
      { title: "Student and staff records", body: "Grades, fees and personal details need backups and proper access control." },
      { title: "No IT person on site", body: "A named technician and a remote help desk, instead of a teacher who 'knows computers'." },
    ],
    services: ["networking-infrastructure", "backup-disaster-recovery", "cybersecurity", "it-support-managed-services"],
    note: "Term-time cover, holiday maintenance windows and per-device pricing can be arranged.",
  },
  {
    slug: "clinics",
    name: "Clinics & health practices",
    headline: "Protect patient records and keep the front desk moving",
    intro: "Patient data is sensitive and downtime means waiting rooms fill up. We make records safe and systems dependable.",
    pains: [
      { title: "Sensitive patient data", body: "Access controls, encryption and an audit of who can see what." },
      { title: "Records you cannot lose", body: "Automated, tested backups with a plan to keep working if the main system fails." },
      { title: "Downtime at the front desk", body: "Reliable network, printers and internet failover so appointments and billing continue." },
      { title: "Old equipment and software", body: "Planned replacement and patching before something fails mid-day." },
    ],
    services: ["backup-disaster-recovery", "cybersecurity", "it-security-audit", "it-policies-compliance-pack"],
    note: "Check the rules that apply to your practice and the Data Protection Act. We help you put the technical safeguards in place.",
  },
  {
    slug: "retail",
    name: "Retail & shops",
    headline: "Tills, stock and Wi-Fi that work every trading day",
    intro: "When the till or card machine stops, you stop selling. We keep point-of-sale, stock and connectivity running.",
    pains: [
      { title: "Point-of-sale downtime", body: "Setup, support and a fallback plan so a fault does not close the shop." },
      { title: "Card and customer data", body: "Separate networks for payments and guests, and secured devices." },
      { title: "Several branches", body: "One set of standards, remote monitoring and the same help desk for every site." },
      { title: "Stock and sales data", body: "Backups and reporting so a lost device does not lose your records." },
    ],
    services: ["hardware-equipment", "networking-infrastructure", "backup-disaster-recovery", "it-support-managed-services"],
    note: "Out-of-hours and weekend support can be added to match your trading hours.",
  },
  {
    slug: "ngos",
    name: "NGOs & non-profits",
    headline: "Do more with the technology you have",
    intro: "Small teams, donor reporting and tight budgets. We make sure technology supports the mission instead of draining it.",
    pains: [
      { title: "Donor and beneficiary data", body: "Policies, access control and backups that meet funder expectations." },
      { title: "Remote and field teams", body: "Secure access, shared files and email that work away from the office." },
      { title: "Licences and costs", body: "A review to find unused subscriptions and use free non-profit offers where available." },
      { title: "Staff turnover", body: "Clean onboarding and offboarding so access never lingers." },
    ],
    services: ["cloud-email-setup-review", "it-policies-compliance-pack", "virtual-it-manager", "it-security-audit"],
    note: "We can document your IT for funder due-diligence requests.",
  },
];

export const getIndustry = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
