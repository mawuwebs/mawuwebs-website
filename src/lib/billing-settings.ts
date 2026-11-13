import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const BILLING_DEFAULTS = {
  legalName: "",
  taxId: "",
  paymentInstructions: "",
  quoteTerms: "",
  defaultCurrency: "GHS",
  defaultTaxBp: 0,
  defaultDueDays: 14,
  remindersEnabled: true,
};
export type BillingSettingsValues = typeof BILLING_DEFAULTS;

export const getBillingSettings = cache(async (): Promise<BillingSettingsValues> => {
  const row = await prisma.billingSettings.findUnique({ where: { id: "main" } });
  return row ? { ...BILLING_DEFAULTS, ...row } : BILLING_DEFAULTS;
});
