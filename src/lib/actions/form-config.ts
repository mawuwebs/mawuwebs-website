"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { estimateSchema, supportSchema } from "@/lib/form-config-schema";

export type FormConfigState = { success: boolean; message: string };

const SCHEMAS = { support: supportSchema, estimate: estimateSchema } as const;
const LABEL = { support: "support form options", estimate: "estimate wizard" } as const;

function refresh() {
  revalidatePath("/admin/forms");
  revalidatePath("/support");
  revalidatePath("/estimate");
}

export async function saveFormConfig(
  key: "support" | "estimate",
  _prev: FormConfigState,
  formData: FormData
): Promise<FormConfigState> {
  try {
    const user = await requireAdmin();
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("json") ?? ""));
    } catch {
      return { success: false, message: "Could not read the form. Reload the page and try again." };
    }
    const parsed = SCHEMAS[key].safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, message: issue?.message ?? "Please check the highlighted values." };
    }
    const value = JSON.stringify(parsed.data);
    await prisma.formConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
    await logActivity({ userId: user.id, action: "updated", entityType: "FormConfig", entityId: key, message: `Updated ${LABEL[key]}` });
    refresh();
    return { success: true, message: "Saved. The public form now uses these options." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Back to the built-in defaults. */
export async function resetFormConfig(key: "support" | "estimate"): Promise<FormConfigState> {
  try {
    const user = await requireAdmin();
    await prisma.formConfig.deleteMany({ where: { key } });
    await logActivity({ userId: user.id, action: "updated", entityType: "FormConfig", entityId: key, message: `Reset ${LABEL[key]} to the defaults` });
    refresh();
    return { success: true, message: "Reset to the defaults." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
