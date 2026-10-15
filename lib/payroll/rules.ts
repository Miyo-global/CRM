/**
 * Single source of truth for payroll money rules.
 *
 * Every payroll number in the app comes from here: the preview, the generate
 * route, the org-wide run and the payslip PDF. No magic numbers elsewhere.
 */

/**
 * Professional tax bands (monthly, INR), lowest band first.
 *
 * OPEN QUESTION (confirm with Tarun): "exactly 11,000 pays 150" and "the upper
 * band is 250, not 200" both come from the Oct 2026 QA sheet, not from a state
 * notification. PT is a state levy, so these need sign-off per state.
 */
export const PT_BANDS: ReadonlyArray<{ upTo: number; amount: number }> = [
  { upTo: 11_000, amount: 150 },
  { upTo: Number.POSITIVE_INFINITY, amount: 250 },
];

/** Earnings split of monthly CTC. */
export const BASIC_PCT = 50;
export const HRA_PCT = 25;
export const SPECIAL_ALLOWANCE_PCT = 25;

/**
 * Pay a mid-month joiner `salary * daysEmployed / daysInMonth` before
 * deductions. OPEN QUESTION: confirm proration is wanted for joiners/leavers.
 */
export const PRORATE_JOINERS = true;

/**
 * Multiplier applied to the per-day rate for an approved extra-pay overtime
 * day when the salary structure does not set one.
 *
 * OPEN QUESTION: salary structures default `sundayOtMultiplier` /
 * `holidayOtMultiplier` to 2.00, but the QA sheet expects 2 overtime days on
 * 33,200 to pay 2,141.94 (= 2 x per-day, i.e. multiplier 1). Structure values
 * still win; this is only the fallback.
 */
export const OVERTIME_DAY_MULTIPLIER = 1;

/** Professional tax for a monthly salary, by band. */
export function professionalTax(monthlySalary: number): number {
  const salary = Number.isFinite(monthlySalary) ? Math.max(0, monthlySalary) : 0;
  for (const band of PT_BANDS) {
    if (salary <= band.upTo) return band.amount;
  }
  return PT_BANDS[PT_BANDS.length - 1]!.amount;
}

/** Human hint for the onboarding salary step: which band a salary falls in. */
export function professionalTaxBandLabel(monthlySalary: number): string {
  const amount = professionalTax(monthlySalary);
  const band = PT_BANDS.find((b) => Math.max(0, monthlySalary) <= b.upTo);
  const bound =
    band && Number.isFinite(band.upTo) ? `up to ₹${band.upTo.toLocaleString("en-IN")}` : "above the top band";
  return `Professional tax ₹${amount}/month (${bound})`;
}

/** Calendar days in a YYYY-MM month. */
export function daysInMonth(monthYyyyMm: string): number {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

/** Per-day rate used for LOP and overtime: salary / calendar days in month. */
export function perDayRate(monthlySalary: number, monthYyyyMm: string): number {
  const days = daysInMonth(monthYyyyMm);
  return days > 0 ? monthlySalary / days : 0;
}

/** Round to 2 decimal places. Applied once, at the end of a calculation. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function splitEarnings(monthlySalary: number): {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
} {
  const basicSalary = round2((monthlySalary * BASIC_PCT) / 100);
  const hra = round2((monthlySalary * HRA_PCT) / 100);
  return {
    basicSalary,
    hra,
    specialAllowance: round2(monthlySalary - basicSalary - hra),
  };
}

export function overtimeAmountForDays(
  perDay: number,
  days: number,
  multiplier: number = OVERTIME_DAY_MULTIPLIER,
): number {
  return round2(perDay * Math.max(0, days) * multiplier);
}

export interface EmploymentWindowInput {
  /** YYYY-MM */
  month: string;
  /** YYYY-MM-DD, or null when unknown (treated as employed all month). */
  joiningDate?: string | null;
  /** YYYY-MM-DD, or null when still employed. */
  exitDate?: string | null;
  /**
   * Today in IST (YYYY-MM-DD). Days on or after today have not happened yet,
   * so they are never counted as loss of pay.
   */
  todayIst?: string | null;
}

export interface EmploymentWindow {
  /** First day of the month the employee was employed, YYYY-MM-DD. */
  start: string;
  /** Last day to evaluate, YYYY-MM-DD. Empty string when the window is empty. */
  end: string;
  /** Days employed within the month (used for joiner/leaver proration). */
  daysEmployed: number;
  /** Calendar days in the month. */
  calendarDays: number;
  /** True when the employee was not employed during this month at all. */
  empty: boolean;
}

function addDays(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * The window payroll may look at for a month: employed days only, never a day
 * in the future. `daysEmployed` ignores `todayIst` — a full month is paid in
 * full even when the run happens mid-month (see A5 confirmation).
 */
export function employmentWindow(input: EmploymentWindowInput): EmploymentWindow {
  const calendarDays = daysInMonth(input.month);
  const monthStart = `${input.month}-01`;
  const monthEnd = `${input.month}-${String(calendarDays).padStart(2, "0")}`;

  const joined = input.joiningDate?.slice(0, 10);
  const exited = input.exitDate?.slice(0, 10);

  const employedStart = joined && joined > monthStart ? joined : monthStart;
  const employedEnd = exited && exited < monthEnd ? exited : monthEnd;

  if (employedStart > monthEnd || employedEnd < monthStart || employedStart > employedEnd) {
    return { start: monthStart, end: "", daysEmployed: 0, calendarDays, empty: true };
  }

  const daysEmployed =
    Number(employedEnd.slice(8, 10)) - Number(employedStart.slice(8, 10)) + 1;

  const yesterday = input.todayIst ? addDays(input.todayIst.slice(0, 10), -1) : monthEnd;
  const evaluateEnd = yesterday < employedEnd ? yesterday : employedEnd;

  return {
    start: employedStart,
    end: evaluateEnd < employedStart ? "" : evaluateEnd,
    daysEmployed,
    calendarDays,
    empty: false,
  };
}

/** Salary actually earned for the month, before any deduction. */
export function earnedSalary(monthlySalary: number, window: EmploymentWindow): number {
  if (window.empty) return 0;
  if (!PRORATE_JOINERS || window.daysEmployed >= window.calendarDays) return round2(monthlySalary);
  return round2((monthlySalary * window.daysEmployed) / window.calendarDays);
}
