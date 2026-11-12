import { z } from "zod";

const optionSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Internal id must be lowercase letters, numbers or dashes."),
  label: z.string().trim().min(1, "Every option needs a label.").max(100),
  hint: z.string().trim().max(200).optional(),
  points: z.coerce.number().int().min(0).max(50),
});

const uniqueIds = (list: { id: string }[]) => new Set(list.map((o) => o.id)).size === list.length;

const optionList = (min: number, what: string) =>
  z
    .array(optionSchema)
    .min(min, `Keep at least ${min} ${what}.`)
    .max(30)
    .refine(uniqueIds, `Two ${what} share the same internal id.`);

export const estimateSchema = z
  .object({
    types: optionList(2, "project types"),
    sizes: optionList(1, "sizes"),
    features: optionList(0, "features"),
    timelines: optionList(1, "timelines"),
    tiers: z
      .array(
        z.object({
          max: z.coerce.number().int().min(0).max(500).nullable(),
          name: z.string().trim().min(1, "Every tier needs a name.").max(60),
          weeks: z.string().trim().max(60),
          summary: z.string().trim().max(400),
        })
      )
      .min(1, "Keep at least one tier."),
    itTier: z.object({
      name: z.string().trim().min(1).max(60),
      weeks: z.string().trim().max(60),
      summary: z.string().trim().max(500),
    }),
  })
  .superRefine((v, ctx) => {
    // Tiers must climb, and only the last one may be open-ended.
    v.tiers.forEach((t, i) => {
      const last = i === v.tiers.length - 1;
      if (last && t.max !== null) ctx.addIssue({ code: "custom", message: "The last tier must have no upper limit.", path: ["tiers", i] });
      if (!last && t.max === null) ctx.addIssue({ code: "custom", message: "Only the last tier can have no upper limit.", path: ["tiers", i] });
      if (!last && i > 0 && t.max !== null && v.tiers[i - 1].max !== null && t.max <= (v.tiers[i - 1].max as number)) {
        ctx.addIssue({ code: "custom", message: "Tier limits must increase from top to bottom.", path: ["tiers", i] });
      }
    });
  });

export const supportSchema = z.object({
  issues: z.array(z.string().trim().min(1).max(100)).min(2, "Keep at least 2 issue types.").max(20),
  urgency: z
    .array(z.object({ label: z.string().trim().min(1).max(100), urgent: z.boolean() }))
    .min(2, "Keep at least 2 urgency levels.")
    .max(6),
});
