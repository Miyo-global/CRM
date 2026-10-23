import { z } from "zod";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

/** Shared by the loan request sheet and POST /api/hr/loans so both enforce the same limits. */
export const MAX_LOAN_AMOUNT = 10_000_000;
export const MAX_LOAN_EMIS = 24;
export const LOAN_REASON_MAX = 500;

const EMIS_MESSAGE = `EMIs must be a whole number between 1 and ${MAX_LOAN_EMIS}`;

export const createLoanSchema = z.object({
  amount: z
    .number({ error: "Enter a loan amount" })
    .positive("Amount must be more than zero")
    .max(MAX_LOAN_AMOUNT, `Amount cannot exceed ${CURRENCY_SYMBOL}${MAX_LOAN_AMOUNT.toLocaleString(DEFAULT_LOCALE)}`),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(LOAN_REASON_MAX, `Reason must be at most ${LOAN_REASON_MAX} characters`),
  totalEmis: z.number({ error: EMIS_MESSAGE }).int(EMIS_MESSAGE).min(1, EMIS_MESSAGE).max(MAX_LOAN_EMIS, EMIS_MESSAGE).optional(),
});
