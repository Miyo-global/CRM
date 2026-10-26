import { z } from "zod";
import { PT_MAX_MONTHLY } from "@/lib/payroll/rules";

/** Plain ASCII digits with at most two decimals: no sign, exponent, comma or ₹. */
const PT_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Monthly professional tax for one employee, shared by the wizard, the
 * profile editor and every server route that accepts it.
 *
 * Output is a number in rupees, or null for "not applicable" (payroll deducts
 * 0). Strings are checked before conversion so "1e3", "+5", " 200" and
 * unicode digits fail instead of being coerced by Number().
 */
export const ptAmountSchema = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === "string") {
      if (v !== v.trim()) return v;
      if (v === "") return null;
      if (!PT_AMOUNT_PATTERN.test(v)) return v;
      return Number(v);
    }
    return v;
  },
  z
    .number({ error: "Enter a valid amount (e.g. 200 or 200.50)" })
    .nonnegative("PT cannot be negative")
    .max(PT_MAX_MONTHLY, `PT cannot exceed ₹${PT_MAX_MONTHLY.toLocaleString("en-IN")} per month`)
    // Tolerance, not ===: 1.15 * 100 is 114.99999999999999 in binary floats.
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "Max 2 decimal places")
    .nullable(),
);

/** PATCH body for the profile editor. */
export const updateProfessionalTaxSchema = z.object({ professionalTax: ptAmountSchema }).strict();

/** "₹1,234.50 / month" or "Not applicable", for review and profile screens. */
export function formatProfessionalTax(value: number | string | null | undefined): string {
  const n = value == null || value === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return "Not applicable";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month`;
}
