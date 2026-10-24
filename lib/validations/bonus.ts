import { z } from "zod";
import { BONUS_MAX_AMOUNT } from "@/lib/constants/hr";
import { isSimpleName, sanitizeSimpleName, SIMPLE_NAME_ALLOWED_HINT } from "@/lib/validations/text-rules";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
import { amountInputError, amountSchema, parseAmountInput, type AmountRules } from "@/lib/numeric-input";

export { BONUS_MAX_AMOUNT };

export const BONUS_MAX_AMOUNT_LABEL = `${CURRENCY_SYMBOL}${BONUS_MAX_AMOUNT.toLocaleString(DEFAULT_LOCALE)}`;
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

/** Form and API share these (R3-EMP-03): "-100" is an error, never +100. */
export const BONUS_AMOUNT_RULES: AmountRules = { max: BONUS_MAX_AMOUNT };

export const bonusAmountSchema = amountSchema(BONUS_AMOUNT_RULES);

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
    amount: bonusAmountSchema,
    reason: z.string().optional(),
    month: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // R2-CRUD-05: any type may carry an optional reason; Other requires one.
    const trimmed = (data.reason ?? "").trim();
    if (data.type !== "OTHER" && !trimmed) return;
    const result = bonusReasonFormatSchema.safeParse(trimmed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["reason"] });
      }
    }
  })
  .transform((data) => ({
    ...data,
    reason: data.reason?.trim() || undefined,
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

  const amountMessage = amountInputError(fields.amount, BONUS_AMOUNT_RULES);
  if (amountMessage) {
    return { ok: false, message: amountMessage, field: "amount" };
  }
  const parsedAmount = parseAmountInput(fields.amount) as number;

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

/** Live message under the field; blank is not an error until submit. */
export function bonusAmountInputError(value: string): string | null {
  return amountInputError(value, { ...BONUS_AMOUNT_RULES, required: false });
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
