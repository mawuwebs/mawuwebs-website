import { BANDS, type Answer } from "@/lib/health-check";

export type ParsedCheck = {
  company: string;
  percent: number;
  bandId: (typeof BANDS)[number]["id"];
  bandLabel: string;
  weakest: string;
  /** Question wording as it was when the visitor answered, so edits to the quiz never break old leads. */
  answers: { text: string; answer: Answer }[];
};

const LABEL_TO_ANSWER: Record<string, Answer> = { Yes: "yes", Partly: "partly", No: "no" };

/** Reads back the text that submitHealthCheck saved into ContactSubmission.message. Null if the format is unexpected. */
export function parseHealthCheck(message: string): ParsedCheck | null {
  const score = message.match(/^Score: \d+\/\d+ \((\d+)%\) - (.+)$/m);
  if (!score) return null;
  const percent = Number(score[1]);
  const band = BANDS.find((b) => b.label === score[2].trim()) ?? BANDS.find((b) => percent >= b.min) ?? BANDS[BANDS.length - 1];
  const answers: ParsedCheck["answers"] = [];
  for (const m of message.matchAll(/^- (.+) (Yes|Partly|No)$/gm)) answers.push({ text: m[1], answer: LABEL_TO_ANSWER[m[2]] });
  return {
    company: message.match(/^Company: (.+)$/m)?.[1] ?? "",
    percent,
    bandId: band.id,
    bandLabel: band.label,
    weakest: message.match(/^Weakest areas: (.+)$/m)?.[1] ?? "",
    answers,
  };
}
