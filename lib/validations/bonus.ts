import { z } from "zod";
import { BONUS_MAX_AMOUNT } from "@/lib/constants/hr";
import { isSimpleName, sanitizeSimpleName, SIMPLE_NAME_ALLOWED_HINT } from "@/lib/validations/text-rules";

export { BONUS_MAX_AMOUNT };

export const BONUS_MAX_AMOUNT_LABEL = `₹${BONUS_MAX_AMOUNT.toLocaleString("en-IN")}`;
export const BONUS_OTHER_REASON_MAX = 30;

export const BONUS_TYPE_VALUES = [
  "PERFORMANCE",
  "FESTIVAL",
  "REFERRAL",
  "SPOT",
  "ANNUAL",
  "RETENTION",
  "OTHER",
] as const;

export type BonusType = (typeof BONUS_TYPE_VALUES)[number];

export const BONUS_TYPE_LABELS: Record<BonusType, string> = {
  PERFORMANCE: "Performance",
  FESTIVAL: "Festival",
  REFERRAL: "Referral",
  SPOT: "Spot",
  RETENTION: "Retention",
  ANNUAL: "Annual",
  OTHER: "Other",
};

const BONUS_LABEL_TO_TYPE = new Map(
  Object.entries(BONUS_TYPE_LABELS).map(([value, label]) => [label.toLowerCase(), value as BonusType]),
);

export function isBonusType(value: string): value is BonusType {
  return (BONUS_TYPE_VALUES as readonly string[]).includes(value);
}

/** Maps enum values or display labels to a valid bonus type. */
export function normalizeBonusType(value: unknown): BonusType | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (isBonusType(upper)) return upper;
  return BONUS_LABEL_TO_TYPE.get(trimmed.toLowerCase()) ?? null;
}

export const bonusAmountSchema = z
  .number()
  .positive("Amount must be greater than 0")
  .max(BONUS_MAX_AMOUNT, `Amount cannot exceed ${BONUS_MAX_AMOUNT_LABEL}`);

export const bonusReasonFormatSchema = z
  .string()
  .trim()
  .min(1, "Reason is required when type is Other")
  .max(BONUS_OTHER_REASON_MAX, `Reason must be ${BONUS_OTHER_REASON_MAX} characters or less`)
  .refine((v) => isSimpleName(v), `Reason can only contain ${SIMPLE_NAME_ALLOWED_HINT}`);

/** @deprecated Use bonusReasonFormatSchema */
export const bonusOtherReasonSchema = bonusReasonFormatSchema;

const bonusTypeSchema = z.preprocess(
  (value) => normalizeBonusType(value),
  z.enum(BONUS_TYPE_VALUES, { message: "Please select a valid bonus type" }),
);

export const createBonusBodySchema = z
  .object({
    userId: z.string().min(1, "Employee is required"),
    type: bonusTypeSchema,
    amount: z.coerce.number().pipe(bonusAmountSchema),
    reason: z.string().optional(),
    month: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "OTHER") return;
    const trimmed = (data.reason ?? "").trim();
    const result = bonusReasonFormatSchema.safeParse(trimmed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["reason"] });
      }
    }
  })
  .transform((data) => ({
    ...data,
    reason: data.type === "OTHER" ? data.reason?.trim() || undefined : undefined,
  }));

export type CreateBonusBody = z.infer<typeof createBonusBodySchema>;

export type CreateBonusFormField = "userId" | "amount" | "type" | "reason";

export function validateCreateBonusForm(fields: {
  userId: string;
  amount: string;
  type: BonusType;
  reason: string;
}): { ok: true; data: CreateBonusBody } | { ok: false; message: string; field: CreateBonusFormField } {
  if (!fields.userId.trim()) {
    return { ok: false, message: "Please select an employee", field: "userId" };
  }

  const amountError = bonusAmountInputError(fields.amount);
  if (!fields.amount.trim()) {
    return { ok: false, message: "Please enter a valid positive amount", field: "amount" };
  }
  if (amountError) {
    return { ok: false, message: amountError, field: "amount" };
  }

  const parsedAmount = parseBonusAmount(fields.amount);
  if (parsedAmount == null) {
    return {
      ok: false,
      message: "Please enter a valid positive amount with up to 2 decimal places",
      field: "amount",
    };
  }

  if (!isBonusType(fields.type)) {
    return { ok: false, message: "Please select a valid bonus type", field: "type" };
  }

  const result = createBonusBodySchema.safeParse({
    userId: fields.userId.trim(),
    type: fields.type,
    amount: parsedAmount,
    reason: fields.reason,
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path[0];
    const field: CreateBonusFormField =
      path === "userId" || path === "amount" || path === "type" || path === "reason"
        ? path
        : "amount";
    return { ok: false, message: issue?.message ?? "Invalid bonus details", field };
  }

  return { ok: true, data: result.data };
}

/** Allows up to 6 integer digits and 2 decimal places while typing. */
export const BONUS_AMOUNT_INPUT_PATTERN = /^\d{0,6}(\.\d{0,2})?$/;

const INVALID_AMOUNT_CHARS = /[eE+\-]/;

export function sanitizeBonusAmountInput(raw: string): string {
  let value = raw.replace(/[^\d.]/g, "");
  const dotIndex = value.indexOf(".");
  if (dotIndex !== -1) {
    value = value.slice(0, dotIndex + 1) + value.slice(dotIndex + 1).replace(/\./g, "");
  }

  const [whole = "", fraction = ""] = value.split(".");
  const limitedWhole = whole.slice(0, 6);
  const limitedFraction = fraction.slice(0, 2);
  const next = dotIndex !== -1 ? `${limitedWhole}.${limitedFraction}` : limitedWhole;

  if (!next || next === ".") return next === "." ? "0." : "";

  const num = Number(next.endsWith(".") ? next.slice(0, -1) : next);
  if (Number.isFinite(num) && num > BONUS_MAX_AMOUNT) {
    return String(BONUS_MAX_AMOUNT);
  }
  return next;
}

export function isBonusAmountWithinLimit(value: string): boolean {
  if (!value) return true;
  return bonusAmountInputError(value) === null && Number(value) > 0;
}

export function bonusAmountInputError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (INVALID_AMOUNT_CHARS.test(trimmed)) {
    return "Amount cannot include negative signs or exponential notation";
  }
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return "Enter a valid positive amount with up to 2 decimal places";
  }
  if (trimmed.endsWith(".")) return null;

  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return "Amount must be greater than 0";
  }
  if (num > BONUS_MAX_AMOUNT) {
    return `Amount cannot exceed ${BONUS_MAX_AMOUNT_LABEL}`;
  }
  return null;
}

export function parseBonusAmount(value: string): number | null {
  const error = bonusAmountInputError(value);
  if (error || !value.trim() || value.trim().endsWith(".")) return null;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : null;
}

export function bonusOtherReasonInputError(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Reason is required when type is Other" : null;
  }
  if (trimmed.length > BONUS_OTHER_REASON_MAX) {
    return `Reason must be ${BONUS_OTHER_REASON_MAX} characters or less`;
  }
  if (!isSimpleName(trimmed)) {
    return `Reason can only contain ${SIMPLE_NAME_ALLOWED_HINT}`;
  }
  return null;
}

export function sanitizeBonusOtherReasonInput(raw: string): string {
  return sanitizeSimpleName(raw).slice(0, BONUS_OTHER_REASON_MAX);
}
