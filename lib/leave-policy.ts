/**
 * Leave entitlements.
 *
 * Day counts are company policy and configurable per deployment; the defaults
 * are what the app shipped with. The type *names* are deliberately not
 * configurable — they are stored on every existing leave row and balance, so
 * renaming them would orphan that data.
 */

function envDays(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

const CASUAL_DAYS_PER_YEAR = envDays("NEXT_PUBLIC_CASUAL_LEAVE_DAYS_PER_YEAR", 12);
const SICK_DAYS_PER_YEAR = envDays("NEXT_PUBLIC_SICK_LEAVE_DAYS_PER_YEAR", 6);

export const LEAVE_POLICY = {
  CASUAL: {
    name: "Casual Leave",
    daysPerYear: CASUAL_DAYS_PER_YEAR,
    perMonth: CASUAL_DAYS_PER_YEAR / 12,
    carryForward: false,
    expiresMonthly: true,
  },
  SICK: {
    name: "Sick Leave",
    daysPerYear: SICK_DAYS_PER_YEAR,
    carryForward: false,
    expiresMonthly: false,
  },
  UNPAID: {
    name: "Unpaid Leave",
    daysPerYear: 0,
    carryForward: false,
    expiresMonthly: false,
  },
} as const;

export const DEFAULT_LEAVE_TYPES = [
  { name: LEAVE_POLICY.CASUAL.name, daysPerYear: LEAVE_POLICY.CASUAL.daysPerYear, carryForward: LEAVE_POLICY.CASUAL.carryForward },
  { name: LEAVE_POLICY.SICK.name, daysPerYear: LEAVE_POLICY.SICK.daysPerYear, carryForward: LEAVE_POLICY.SICK.carryForward },
  { name: LEAVE_POLICY.UNPAID.name, daysPerYear: LEAVE_POLICY.UNPAID.daysPerYear, carryForward: LEAVE_POLICY.UNPAID.carryForward },
] as const;

export const ALLOWED_LEAVE_TYPE_NAMES: ReadonlySet<string> = new Set([
  LEAVE_POLICY.CASUAL.name,
  LEAVE_POLICY.SICK.name,
  LEAVE_POLICY.UNPAID.name,
]);

export const LEAVE_MAX_DAYS: Record<string, number> = {
  [LEAVE_POLICY.SICK.name]: LEAVE_POLICY.SICK.daysPerYear,
  [LEAVE_POLICY.CASUAL.name]: LEAVE_POLICY.CASUAL.daysPerYear,
};

export function calculateProratedCasualLeaves(
  joiningDate: Date | string,
  year: number,
): number {
  const d = typeof joiningDate === "string" ? new Date(joiningDate) : joiningDate;
  const joinYear = d.getFullYear();

  if (joinYear > year) return 0;
  if (joinYear < year) return LEAVE_POLICY.CASUAL.daysPerYear;
  const joiningMonth = d.getMonth();
  // Accrue the monthly rate for each remaining month. Derived from perMonth
  // rather than subtracting months from the annual total, which only agrees
  // with the annual figure while the allocation happens to be 12/year.
  const remainingMonths = 12 - joiningMonth;
  return Math.round(LEAVE_POLICY.CASUAL.perMonth * remainingMonths);
}

export function getSickLeaveAllocation(): number {
  return LEAVE_POLICY.SICK.daysPerYear;
}

export function resolveInitialBalance(
  typeName: string,
  daysPerYear: number,
  joiningDate: Date | string,
  year: number,
): number {
  switch (typeName) {
    case LEAVE_POLICY.CASUAL.name:
      return calculateProratedCasualLeaves(joiningDate, year);
    case LEAVE_POLICY.SICK.name:
      return getSickLeaveAllocation();
    case LEAVE_POLICY.UNPAID.name:
      return 0;
    default:
      return daysPerYear;
  }
}

/** Unpaid leave is tracked separately and does not consume a leave balance pool. */
export function isUnpaidLeaveType(typeName: string): boolean {
  const n = typeName.trim().toLowerCase();
  return n === LEAVE_POLICY.UNPAID.name.toLowerCase() || n.includes("unpaid");
}
