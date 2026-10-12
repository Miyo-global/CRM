import { toneDot, toneSoft } from "@/lib/design/tones";

export type CertStatus = "expired" | "expiring" | "valid" | "none";

const EXPIRING_SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, day] = match;
  const dt = new Date(Number(y), Number(m) - 1, Number(day));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function daysUntil(validUntil: string | null | undefined, now: Date = new Date()): number | null {
  const target = parseDateOnly(validUntil);
  if (!target) return null;
  return Math.round((startOfDay(target) - startOfDay(now)) / DAY_MS);
}

export function getCertStatus(
  validUntil: string | null | undefined,
  now: Date = new Date(),
): CertStatus {
  const days = daysUntil(validUntil, now);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "valid";
}

export function certBadgeClass(status: CertStatus): string {
  switch (status) {
    case "expired":
      return `${toneSoft.danger} border-transparent`;
    case "expiring":
      return `${toneSoft.warning} border-transparent`;
    case "valid":
      return `${toneSoft.success} border-transparent`;
    default:
      return `${toneSoft.neutral} border-transparent`;
  }
}

export function certDotClass(status: CertStatus): string {
  switch (status) {
    case "expired":
      return toneDot.danger;
    case "expiring":
      return toneDot.warning;
    case "valid":
      return toneDot.success;
    default:
      return toneDot.neutral;
  }
}

export function certStatusLabel(
  status: CertStatus,
  validUntil: string | null | undefined,
  now: Date = new Date(),
): string {
  const days = daysUntil(validUntil, now);
  switch (status) {
    case "expired":
      return days === null ? "Expired" : `Expired ${Math.abs(days)}d ago`;
    case "expiring":
      return days === 0 ? "Expires today" : `Expires in ${days}d`;
    case "valid":
      return "Valid";
    default:
      return "";
  }
}

export function formatCertDate(value: string | null | undefined): string {
  const dt = parseDateOnly(value);
  if (!dt) return "";
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
