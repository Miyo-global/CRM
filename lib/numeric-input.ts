import type { KeyboardEvent } from "react";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

export function sanitizeDigitsOnly(value: string, maxLength = 12): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function sanitizeDecimalString(value: string, maxLength = 6): string {
  let s = value.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s.slice(0, maxLength);
}

export function sanitizePositiveIntegerString(value: string, maxLength = 9): string {
  const digits = value.replace(/\D/g, "").slice(0, maxLength);
  if (digits.length > 1 && digits.startsWith("0")) {
    return digits.replace(/^0+/, "") || "";
  }
  return digits;
}

export function clampIntegerString(value: string, max: number, maxLength = 3): string {
  const digits = sanitizePositiveIntegerString(value.replace(/,/g, ""), maxLength);
  if (!digits) return "";
  const n = Number(digits);
  if (n > max) return String(max);
  return digits;
}

/** Display integer with Indian grouping (e.g. 1000000 → 10,00,000). */
export function formatIndianInteger(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 0 }).format(n);
}

/** Parse typed/display value to raw digit string, capped at max. */
export function clampIndianIntegerInput(
  value: string,
  max: number,
  maxDigits = 8,
): string {
  return clampIntegerString(value.replace(/,/g, ""), max, maxDigits);
}

export function blockNonDigitKey(e: KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const allowed = [
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];
  if (allowed.includes(e.key)) return;
  if (/^\d$/.test(e.key)) return;
  e.preventDefault();
}
