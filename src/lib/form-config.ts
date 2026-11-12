import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ESTIMATE, type EstimateConfig } from "@/lib/estimate";
import { DEFAULT_SUPPORT, type SupportConfig } from "@/lib/support";
import { estimateSchema, supportSchema } from "@/lib/form-config-schema";

export type FormConfigKey = "support" | "estimate";

async function load<T>(key: FormConfigKey, schema: { safeParse(v: unknown): { success: boolean; data?: T } }, fallback: T): Promise<T> {
  try {
    const row = await prisma.formConfig.findUnique({ where: { key } });
    if (!row) return fallback;
    const parsed = schema.safeParse(JSON.parse(row.value));
    // A hand-edited or outdated row must never take the public form down.
    return parsed.success && parsed.data ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export const getSupportConfig = () => load<SupportConfig>("support", supportSchema, DEFAULT_SUPPORT);
export const getEstimateConfig = () => load<EstimateConfig>("estimate", estimateSchema, DEFAULT_ESTIMATE);
