
export const LEAVE_POLICY = {
  CASUAL: {
    name: "Casual Leave",
    daysPerYear: 12,
    perMonth: 1,
    carryForward: false,
    expiresMonthly: true,
  },
  SICK: {
    name: "Sick Leave",
    daysPerYear: 6,
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
  return LEAVE_POLICY.CASUAL.daysPerYear - joiningMonth;
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
