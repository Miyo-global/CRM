import { ptAmountSchema } from "@/lib/validations/professional-tax";

/**
 * Monthly professional tax for the manual payslip scripts, from PAYSLIP_PT
 * (e.g. `PAYSLIP_PT=200 tsx scripts/generate-miyo-payslips.ts` to re-issue
 * payslips with the ₹200 that was deducted then). PT is never a constant in
 * code; empty means not applicable (0).
 */
function payslipPtFromEnv(): number {
  const raw = process.env.PAYSLIP_PT;
  if (raw === undefined) {
    throw new Error("Set PAYSLIP_PT to the monthly professional tax for these payslips (e.g. PAYSLIP_PT=200, or PAYSLIP_PT= for none).");
  }
  return ptAmountSchema.parse(raw) ?? 0;
}

export const PAYSLIP_PT = payslipPtFromEnv();
