/**
 * Single source of truth for payroll money rules.
 *
 * Every payroll number in the app comes from here: the preview, the generate
 * route, the org-wide run and the payslip PDF. No magic numbers elsewhere.
 */

/**
 * Professional tax is a per-employee amount stored on the salary structure
 * (`salary_structures.professional_tax`), never a band or constant in code.
 * NULL means "not applicable" and payroll deducts 0.
 *
 * PT_MAX_MONTHLY caps the field: Article 276(2) limits PT to ₹2,500 a year,
 * and a single month can legitimately carry a large share of it (Maharashtra
 * takes ₹300 in February). PT_ANNUAL_CAP drives a soft warning only.
 *
 * Future work (not built): per-month overrides (e.g. February), state slab
 * tables keyed on work location, and tracking the ₹2,500 annual cap.
 */
export const PT_MAX_MONTHLY = 2500;
export const PT_ANNUAL_CAP = 2500;

/** Stored PT (decimal string or null) as the amount payroll deducts. */
export function professionalTaxFromStored(stored: string | null | undefined): number {
  const n = stored == null ? NaN : parseFloat(stored);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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
 * day: 1x (QA sheet: 2 OT days on 33,200 pay 2,141.94). A value stored on the
 * salary structure still wins; new structures default to 1.00 (0157).
 */
export const OVERTIME_DAY_MULTIPLIER = 1;

/** OT multiplier from a salary-structure column, falling back to 1x. */
export function otMultiplier(stored: string | null | undefined): number {
  const n = stored == null ? NaN : parseFloat(stored);
  return Number.isFinite(n) ? n : OVERTIME_DAY_MULTIPLIER;
}

/** Calendar days in a YYYY-MM month. */
export function daysInMonth(monthYyyyMm: string): number {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

/** Per-day divisor for LOP and overtime, whatever the month length (Tarun's rule). */
export const PER_DAY_DIVISOR = 31;

/** Per-day rate used for LOP and overtime: salary / 31 in every month. */
export function perDayRate(monthlySalary: number): number {
  return monthlySalary / PER_DAY_DIVISOR;
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

/**
 * What the wizard shows for a monthly CTC before the first payroll run:
 * the 50/25/25 split, the employee's PT and the resulting net.
 */
export function monthlyBreakdown(monthlySalary: number, professionalTax: number | null) {
  const salary = Number.isFinite(monthlySalary) ? Math.max(0, monthlySalary) : 0;
  const pt = Math.max(0, professionalTax ?? 0);
  return { ...splitEarnings(salary), professionalTax: pt, net: round2(salary - pt) };
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

/**
 * Extra line for the "month has not ended" banner. Remaining days are paid as
 * present, but a mid-month joiner is still prorated from the joining date, which
 * read as a contradiction without this (FR1-005).
 */
export function joinerProrationNote(month: string, joiningDate: string | null | undefined): string | null {
  if (!PRORATE_JOINERS) return null;
  const window = employmentWindow({ month, joiningDate, exitDate: null, todayIst: null });
  if (window.empty || window.daysEmployed >= window.calendarDays) return null;
  const days = window.daysEmployed === 1 ? "1 day" : `${window.daysEmployed} days`;
  return `Pay starts on the joining date, so it covers ${days} of this month.`;
}

/**
 * Salary actually earned for the month, before any deduction.
 *
 * Proration divides by 31 like every other per-day figure, not by the month's
 * length — a 30-day month was paying salary/30 per day (QA-0053).
 */
export function earnedSalary(monthlySalary: number, window: EmploymentWindow): number {
  if (window.empty) return 0;
  if (!PRORATE_JOINERS || window.daysEmployed >= window.calendarDays) return round2(monthlySalary);
  return round2((monthlySalary * window.daysEmployed) / PER_DAY_DIVISOR);
}

/**
 * MIYO-0125: EMIs are stored rounded up, so n equal instalments collect up to
 * a rupee more than the loan. Each instalment is capped at what is still
 * owed, which makes the last one the remainder.
 */
export function emiDueFor(loan: {
  amount: string;
  emiAmount: string | null;
  paidEmis: number | null;
}): number {
  const emi = parseFloat(loan.emiAmount ?? "0") || 0;
  const total = parseFloat(loan.amount) || 0;
  const outstanding = round2(total - emi * (loan.paidEmis ?? 0));
  if (outstanding <= 0) return 0;
  return Math.min(emi, outstanding);
}
