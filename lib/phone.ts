import { z } from "zod";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import type { Country } from "react-phone-number-input";

export type PhoneValue = string;

export const DEFAULT_PHONE_COUNTRY: Country = "IN";

export const PHONE_INPUT_PLACEHOLDER = "9012345678";

export function formatPhoneForDisplay(value: string | undefined | null): string {
  if (!value || value.trim() === "") return "";
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed) return parsed.formatInternational();
  } catch {
    // ignore
  }
  return value;
}

export function isOptionalPhoneValid(value: string | undefined | null): boolean {
  if (!value || value.trim() === "") return true;
  return isValidPhoneNumber(value);
}

export const optionalPhoneSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => isOptionalPhoneValid(val), { message: "Invalid phone number" });

export const requiredPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => isValidPhoneNumber(val), "Invalid phone number");
