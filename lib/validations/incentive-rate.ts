import { z } from "zod";

export const INCENTIVE_RATE_MAX = 100;

const INVALID_RATE_CHARS = /[eE+\-]/;

export function sanitizeIncentiveRateInput(raw: string): string {
  let value = raw.replace(/[^\d.]/g, "");
  const dotIndex = value.indexOf(".");
  if (dotIndex !== -1) {
    value = value.slice(0, dotIndex + 1) + value.slice(dotIndex + 1).replace(/\./g, "");
  }

  const [whole = "", fraction = ""] = value.split(".");
  const limitedWhole = whole.slice(0, 3);
  const limitedFraction = fraction.slice(0, 2);
  const next = dotIndex !== -1 ? `${limitedWhole}.${limitedFraction}` : limitedWhole;

  if (!next || next === ".") return next === "." ? "0." : "";

  const num = Number(next.endsWith(".") ? next.slice(0, -1) : next);
  if (Number.isFinite(num) && num > INCENTIVE_RATE_MAX) {
    return String(INCENTIVE_RATE_MAX);
  }
  return next;
}

export function incentiveRateInputError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (INVALID_RATE_CHARS.test(trimmed)) {
    return "Rate cannot include negative signs or exponential notation";
  }
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return "Enter a valid rate with up to 2 decimal places";
  }
  if (trimmed.endsWith(".")) return null;

  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return "Rate must be greater than 0";
  }
  if (num > INCENTIVE_RATE_MAX) {
    return `Rate cannot exceed ${INCENTIVE_RATE_MAX}%`;
  }
  return null;
}

export function parseIncentiveRate(value: string): number | null {
  const error = incentiveRateInputError(value);
  if (error || !value.trim() || value.trim().endsWith(".")) return null;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : null;
}

/** Preserve entered precision up to 2 decimal places for storage. */
export function normalizeIncentiveRateString(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.endsWith(".")) return null;
  const parsed = parseIncentiveRate(trimmed);
  if (parsed == null) return null;

  if (!trimmed.includes(".")) return String(parsed);
  const fraction = trimmed.split(".")[1] ?? "";
  if (fraction.length === 0) return String(parsed);
  return parsed.toFixed(Math.min(fraction.length, 2));
}

export const incentiveRateSchema = z
  .string()
  .min(1, "Incentive rate is required")
  .superRefine((value, ctx) => {
    const message = incentiveRateInputError(value);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  })
  .transform((value) => normalizeIncentiveRateString(value)!);

export const createIncentiveConfigBodySchema = z.object({
  incentiveRate: incentiveRateSchema,
});
