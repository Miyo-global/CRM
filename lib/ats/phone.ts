/**
 * MIYO-0639: phone numbers as typed are useless for finding duplicates.
 * This keeps the digits, drops an Indian 0 or 91 prefix, and keeps the
 * last ten digits — enough to match the same person twice.
 */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const trimmed = digits.replace(/^(0|91)(?=\d{10}$)/, "");
  return trimmed.slice(-10);
}
