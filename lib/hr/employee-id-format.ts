export const AUTO_EMPLOYEE_ID_PREFIX = "VC";

const AUTO_ID_SUFFIX_PATTERN = /^\d{3,}$/;

export function yearSuffix(date: Date): string {
  return String(date.getFullYear()).slice(-2);
}

export function buildAutoEmployeeId(year: Date, sequence: number): string {
  const yy = yearSuffix(year);
  const seq = String(sequence).padStart(3, "0");
  return `${AUTO_EMPLOYEE_ID_PREFIX}${yy}${seq}`;
}

export function parseAutoSequence(employeeId: string, yy: string): number | null {
  const prefix = `${AUTO_EMPLOYEE_ID_PREFIX}${yy}`;
  if (!employeeId.startsWith(prefix)) return null;
  const suffix = employeeId.slice(prefix.length);
  if (!AUTO_ID_SUFFIX_PATTERN.test(suffix)) return null;
  const n = Number.parseInt(suffix, 10);
  return Number.isFinite(n) ? n : null;
}

export function normalizeEmployeeIdInput(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
