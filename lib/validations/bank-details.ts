import { z } from "zod";

export const BANK_ACCOUNT_NUMBER_MIN = 8;
export const BANK_ACCOUNT_NUMBER_MAX = 18;
export const BANK_NAME_MIN = 2;
export const BANK_NAME_MAX = 100;
export const BRANCH_NAME_MIN = 2;
export const BRANCH_NAME_MAX = 100;
export const ACCOUNT_HOLDER_MIN = 2;
export const ACCOUNT_HOLDER_MAX = 100;
export const IFSC_LENGTH = 11;
export const SWIFT_CODE_MIN = 8;
export const SWIFT_CODE_MAX = 11;
export const IBAN_MIN_LENGTH = 15;
export const IBAN_MAX_LENGTH = 34;
export const PF_UAN_LENGTH = 12;

const BANK_NAME_PATTERN = /^[A-Za-z0-9&.\s'-]+$/;
const BRANCH_PATTERN = /^[A-Za-z0-9\s,'.-]+$/;
const ACCOUNT_HOLDER_PATTERN = /^[A-Za-z\s.'-]+$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_PATTERN = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

const optionalPfUanNumber = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || /^\d{12}$/.test(val), `UAN must be exactly ${PF_UAN_LENGTH} digits`)
  .or(z.literal(""));

const optionalSwiftCode = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) =>
      !val ||
      (val.length >= SWIFT_CODE_MIN &&
        val.length <= SWIFT_CODE_MAX &&
        SWIFT_PATTERN.test(val.toUpperCase())),
    `SWIFT/BIC code must be ${SWIFT_CODE_MIN}–${SWIFT_CODE_MAX} characters (e.g. HDFCINBB)`,
  )
  .or(z.literal(""));

const optionalIban = z
  .string()
  .trim()
  .optional()
  .refine((val) => {
    if (!val) return true;
    const normalized = val.toUpperCase().replace(/\s/g, "");
    return (
      normalized.length >= IBAN_MIN_LENGTH &&
      normalized.length <= IBAN_MAX_LENGTH &&
      IBAN_PATTERN.test(normalized)
    );
  }, `IBAN must be ${IBAN_MIN_LENGTH}–${IBAN_MAX_LENGTH} characters`)
  .or(z.literal(""));

export const bankDetailsSchema = z
  .object({
    accountNumber: z
      .string()
      .trim()
      .min(1, "Account number is required")
      .regex(/^\d+$/, "Account number must contain only digits")
      .min(
        BANK_ACCOUNT_NUMBER_MIN,
        `Account number must be at least ${BANK_ACCOUNT_NUMBER_MIN} digits`,
      )
      .max(
        BANK_ACCOUNT_NUMBER_MAX,
        `Account number must be at most ${BANK_ACCOUNT_NUMBER_MAX} digits`,
      ),
    bankName: z
      .string()
      .trim()
      .min(1, "Bank name is required")
      .min(BANK_NAME_MIN, `Bank name must be at least ${BANK_NAME_MIN} characters`)
      .max(BANK_NAME_MAX, `Bank name must be at most ${BANK_NAME_MAX} characters`)
      .regex(BANK_NAME_PATTERN, "Bank name contains invalid characters"),
    branch: z
      .string()
      .trim()
      .min(1, "Branch name is required")
      .min(BRANCH_NAME_MIN, `Branch must be at least ${BRANCH_NAME_MIN} characters`)
      .max(BRANCH_NAME_MAX, `Branch must be at most ${BRANCH_NAME_MAX} characters`)
      .regex(BRANCH_PATTERN, "Branch name contains invalid characters"),
    ifsc: z
      .string()
      .trim()
      .transform((val) => val.toUpperCase())
      .pipe(
        z
          .string()
          .length(IFSC_LENGTH, `IFSC code must be exactly ${IFSC_LENGTH} characters`)
          .regex(IFSC_PATTERN, "Invalid IFSC format (e.g. SBIN0001234)"),
      ),
    accountHolder: z
      .string()
      .trim()
      .min(1, "Account holder name is required")
      .min(
        ACCOUNT_HOLDER_MIN,
        `Account holder name must be at least ${ACCOUNT_HOLDER_MIN} characters`,
      )
      .max(
        ACCOUNT_HOLDER_MAX,
        `Account holder name must be at most ${ACCOUNT_HOLDER_MAX} characters`,
      )
      .regex(
        ACCOUNT_HOLDER_PATTERN,
        "Account holder name may only contain letters, spaces, and . ' -",
      ),
    pfUanNumber: optionalPfUanNumber,
    swiftCode: optionalSwiftCode,
    iban: optionalIban,
  });

export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

export const partialBankDetailsSchema = bankDetailsSchema.partial();
