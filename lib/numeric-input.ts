import { z } from "zod";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

/**
 * Money fields (R3-EMP-03). Inputs keep exactly what was typed; nothing here
 * rewrites text. The old keystroke sanitisers dropped "-" and letters, so
 * "-500" was saved as +500 and "12abc" as 12. Text is parsed on submit and a
 * bad value gets a message instead.
 */
export type AmountRules = {
  /** Shown in messages: "<label> must be greater than 0". */
  label?: string;
  max: number;
  /** 0 is a valid value (deductions, asset cost); otherwise it must be > 0. */
  allowZero?: boolean;
  /** Fraction digits allowed; 0 = whole numbers only. Default 2. */
  decimals?: number;
  /** Appended to the ceiling message, e.g. " per claim". */
  maxSuffix?: string;
};

/** Typed text -> number. Blank -> undefined; anything not a plain number -> NaN. */
export function parseAmountInput(text: string): number | undefined {
  const t = text.replace(/,/g, "").trim();
  if (!t) return undefined;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

function toAmount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return parseAmountInput(value);
  if (typeof value === "number") return value;
  return NaN;
}

export function formatAmountLimit(n: number): string {
  return `${CURRENCY_SYMBOL}${n.toLocaleString(DEFAULT_LOCALE)}`;
}

/** The one place money messages are written. `undefined` = left blank. */
export function amountError(
  value: number | undefined,
  rules: AmountRules & { required?: boolean },
): string | null {
  const label = rules.label ?? "Amount";
  const decimals = rules.decimals ?? 2;
  if (value === undefined) return rules.required === false ? null : `${label} is required`;
  if (!Number.isFinite(value)) return `${label} must be a number, e.g. 1500`;
  if (value < 0 && rules.allowZero) return `${label} cannot be negative`;
  if (value < 0 || (value === 0 && !rules.allowZero)) return `${label} must be greater than 0`;
  if (decimals === 0 && !Number.isInteger(value)) return `${label} must be a whole number`;
  const scaled = value * 10 ** decimals;
  if (Math.abs(Math.round(scaled) - scaled) > 1e-6) {
    return `${label} can have at most ${decimals} decimal places`;
  }
  if (value > rules.max) return `${label} cannot exceed ${formatAmountLimit(rules.max)}${rules.maxSuffix ?? ""}`;
  return null;
}

/** For text held in component state: same messages as the schemas. */
export function amountInputError(text: string, rules: AmountRules & { required?: boolean }): string | null {
  return amountError(parseAmountInput(text), rules);
}

/**
 * Zod field for a required amount. Takes a number or the typed text, so the
 * form, the API and an import all give the same message. Typed number-in so
 * react-hook-form sees a number field; text ("1,500") still parses at runtime.
 */
export function amountSchema(rules: AmountRules): z.ZodType<number, number> {
  return z.unknown().transform((raw, ctx): number => {
    const value = toAmount(raw);
    const message = amountError(value, { ...rules, required: true });
    if (message) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return value as number;
  }) as unknown as z.ZodType<number, number>;
}

/** Same as amountSchema, but blank is allowed and comes out as undefined. */
export function optionalAmountSchema(rules: AmountRules): z.ZodType<number | undefined, number | undefined> {
  // .optional(): zod >=4.6 reports a missing key as "expected nonoptional"
  // unless the transform's output is marked optional.
  return z.unknown().transform((raw, ctx): number | undefined => {
    const value = raw === "" ? undefined : toAmount(raw);
    const message = amountError(value, { ...rules, required: false });
    if (message) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return value;
  }).optional() as unknown as z.ZodType<number | undefined, number | undefined>;
}
