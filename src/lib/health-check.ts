// Scoring model for the /it-health-check quiz. Pure data + maths, shared by the client (instant feedback)
// and the server action (which recomputes from the raw answers, so the saved score can't be tampered with).

export type Answer = "yes" | "partly" | "no";
export const ANSWER_POINTS: Record<Answer, number> = { yes: 2, partly: 1, no: 0 };

export type Question = {
  id: string;
  area: string;
  text: string;
  hint?: string;
  /** Shown in the report when the answer is not "yes". */
  gap: string;
  /** Service slug that fixes the gap. */
  service: string;
};

export const QUESTIONS: Question[] = [
  {
    id: "backup-auto",
    area: "Backups",
    text: "Are your important files backed up automatically, without anyone remembering to do it?",
    gap: "Backups depend on people remembering. One missed week can mean a lost week of work.",
    service: "backup-disaster-recovery",
  },
  {
    id: "backup-offsite",
    area: "Backups",
    text: "Is at least one copy of your backups stored away from your office (cloud or another site)?",
    hint: "A drive in the same room as the computers does not count.",
    gap: "A fire, flood or theft would take the backups with the originals.",
    service: "backup-disaster-recovery",
  },
  {
    id: "backup-tested",
    area: "Backups",
    text: "Have you successfully restored a file from backup in the last 6 months?",
    gap: "An untested backup is a hope, not a backup. Many only fail on the day they are needed.",
    service: "backup-disaster-recovery",
  },
  {
    id: "mfa",
    area: "Accounts & access",
    text: "Do staff use a second step (code or app) to sign in to email and key systems?",
    gap: "A single stolen password gives an attacker full access to email and files.",
    service: "cybersecurity",
  },
  {
    id: "offboarding",
    area: "Accounts & access",
    text: "When someone leaves, is their access removed the same day?",
    gap: "Former staff keep access to email, files and systems long after they leave.",
    service: "it-consulting-training",
  },
  {
    id: "passwords",
    area: "Accounts & access",
    text: "Does your team use a password manager instead of reusing or writing down passwords?",
    gap: "Reused passwords turn one breach somewhere else into a breach of your business.",
    service: "cybersecurity",
  },
  {
    id: "patching",
    area: "Devices & software",
    text: "Are computers and software updated regularly, with antivirus running on every device?",
    gap: "Unpatched software is the most common way attackers get in.",
    service: "cybersecurity",
  },
  {
    id: "licences",
    area: "Devices & software",
    text: "Is all your software properly licensed, and do you know what you pay for each month?",
    gap: "Unlicensed or unused subscriptions are a legal risk and a quiet cost.",
    service: "it-consulting-training",
  },
  {
    id: "inventory",
    area: "Devices & software",
    text: "Do you have a list of every computer, phone and device the business owns, and who uses it?",
    gap: "You cannot protect or replace what you have not listed.",
    service: "hardware-equipment",
  },
  {
    id: "network",
    area: "Network",
    text: "Is your Wi-Fi password-protected with a separate guest network, behind a business-grade firewall?",
    gap: "One shared network means a visitor's phone sits next to your accounts and files.",
    service: "networking-infrastructure",
  },
  {
    id: "support",
    area: "Support & continuity",
    text: "Do you know who to call when IT breaks, and do they respond within a business day?",
    gap: "Downtime drags on while staff try to fix things themselves or search for help.",
    service: "it-consulting-training",
  },
  {
    id: "plan",
    area: "Support & continuity",
    text: "If your main computer or internet failed today, could the team keep working?",
    gap: "There is no continuity plan, so a single failure stops the business.",
    service: "backup-disaster-recovery",
  },
];

export const MAX_SCORE = QUESTIONS.length * 2;

export type Band = { id: "strong" | "fair" | "exposed" | "critical"; label: string; summary: string; min: number };

// Percent thresholds, highest first.
export const BANDS: Band[] = [
  { id: "strong", min: 80, label: "Strong", summary: "Your basics are in good shape. A review would focus on keeping them that way." },
  { id: "fair", min: 55, label: "Fair", summary: "Most basics are covered, with a few gaps worth closing before they cost you." },
  { id: "exposed", min: 30, label: "Exposed", summary: "Several important gaps. One bad day could mean lost data or lost time." },
  { id: "critical", min: 0, label: "Critical", summary: "Core protections are missing. Fixing the top gaps now is cheaper than recovering later." },
];

export type Result = {
  score: number;
  percent: number;
  band: Band;
  areas: { area: string; percent: number }[];
  gaps: { id: string; area: string; gap: string; service: string; severity: "no" | "partly" }[];
};

export function parseAnswers(raw: unknown, questions: Question[] = QUESTIONS): Record<string, Answer> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, Answer> = {};
  for (const q of questions) {
    const v = (raw as Record<string, unknown>)[q.id];
    if (v !== "yes" && v !== "partly" && v !== "no") return null;
    out[q.id] = v;
  }
  return out;
}

export function scoreAnswers(answers: Record<string, Answer>, questions: Question[] = QUESTIONS): Result {
  let score = 0;
  const byArea = new Map<string, { got: number; max: number }>();
  const gaps: Result["gaps"] = [];
  const maxScore = questions.length * 2;
  for (const q of questions) {
    const a = answers[q.id];
    const pts = ANSWER_POINTS[a];
    score += pts;
    const cur = byArea.get(q.area) ?? { got: 0, max: 0 };
    byArea.set(q.area, { got: cur.got + pts, max: cur.max + 2 });
    if (a !== "yes") gaps.push({ id: q.id, area: q.area, gap: q.gap, service: q.service, severity: a });
  }
  const percent = Math.round((score / maxScore) * 100);
  const band = BANDS.find((b) => percent >= b.min) ?? BANDS[BANDS.length - 1];
  // Worst first: "no" before "partly".
  gaps.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "no" ? -1 : 1));
  return {
    score,
    percent,
    band,
    areas: [...byArea].map(([area, v]) => ({ area, percent: Math.round((v.got / v.max) * 100) })),
    gaps,
  };
}
