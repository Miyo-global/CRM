import "server-only";

import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  organizationMembers,
  attendance,
  holidayWorkRequests,
  salaryLoans,
  users,
} from "@/lib/db/schema";
import { eq, and, inArray, gte, lte, sql, ne } from "drizzle-orm";
import {
  calendarDaysInMonth,
  roundInr,
  PROFESSIONAL_TAX_INR,
  HOLIDAY_WORK_FULL_DAY_HOURS,
  splitMonthlyCtc505025,
  computeStatutory,
  type StrictAttendanceResult,
} from "@/lib/hr/payroll-calculations";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";
import { getStrictPayrollAttendanceBatch } from "@/lib/hr/payroll-attendance";

export interface GeneratePayrollForOrgOptions {
  orgId: string;
  /** Calendar month key, YYYY-MM. Payroll rows are keyed by this month. */
  month: string;
  /** User who triggered the generation (manual admin or the schedule creator for automated runs). */
  generatedBy: string;
  /** Per-employee bonus / other-deduction overrides (manual flows only). */
  overrides?: Record<string, { otherDeductions?: number; bonus?: number }>;
  /**
   * Optional custom-period end (YYYY-MM-DD) within the month. Caps how far the
   * attendance window is evaluated so a partial period is not docked as LOP for
   * the days after it. Defaults to today (IST) inside the attendance helper.
   */
  evaluateThrough?: string;
}

export interface GeneratePayrollForOrgResult {
  generated: number;
  payrollIds: number[];
}

/**
 * Shared all-employee payroll generation for a single org + month.
 *
 * Used by the manual bulk-generate API route and by the automated payroll
 * schedule (Inngest). Attendance, LOP, overtime and statutory
 * deductions are computed strictly from check-ins for the calendar month
 * (the same logic the per-employee generate route and overtime preview use).
 *
 * Idempotent at the row level: rows that already exist for (orgId, userId,
 * month) are skipped via ON CONFLICT DO NOTHING, so re-running for the same
 * period never produces duplicates.
 */
export async function generatePayrollForOrg(
  opts: GeneratePayrollForOrgOptions,
): Promise<GeneratePayrollForOrgResult> {
  const { orgId, month, generatedBy } = opts;

  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
  });
  const memberUserIds = memberships.map((m) => m.userId).filter(Boolean) as string[];
  if (memberUserIds.length === 0) return { generated: 0, payrollIds: [] };

  const calDays = calendarDaysInMonth(month);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(calDays).padStart(2, "0")}`;

  const [allSalaryStructures, overlappingSalaryStructures, allUsers, existingPayrolls] =
    await Promise.all([
      db.query.salaryStructures.findMany({
        where: and(
          inArray(salaryStructures.userId, memberUserIds),
          eq(salaryStructures.orgId, orgId),
          eq(salaryStructures.isActive, true),
        ),
      }),
      db.query.salaryStructures.findMany({
        where: and(
          inArray(salaryStructures.userId, memberUserIds),
          eq(salaryStructures.orgId, orgId),
          sql`${salaryStructures.effectiveFrom} <= ${monthEnd}`,
          sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStart})`,
        ),
        orderBy: [salaryStructures.effectiveFrom],
      }),
      db.query.users.findMany({
        where: inArray(users.id, memberUserIds),
        columns: { id: true, monthlySalary: true },
      }),
      db.query.payrolls.findMany({
        where: and(
          inArray(payrolls.userId, memberUserIds),
          eq(payrolls.month, month),
          eq(payrolls.orgId, orgId),
        ),
        columns: { userId: true },
      }),
    ]);

  const monthlySalaryMap = new Map(
    allUsers.map((u) => {
      const v = parseFloat(u.monthlySalary ?? "0");
      return [u.id, Number.isFinite(v) ? v : 0];
    }),
  );

  const salaryMap = new Map(allSalaryStructures.map((s) => [s.userId, s]));
  const structuresByUser = new Map<string, typeof overlappingSalaryStructures>();
  for (const s of overlappingSalaryStructures) {
    const arr = structuresByUser.get(s.userId) ?? [];
    arr.push(s);
    structuresByUser.set(s.userId, arr);
  }
  const existingPayrollUserIds = new Set(existingPayrolls.map((p) => p.userId));

  const strictAttendance: Map<string, StrictAttendanceResult> =
    await getStrictPayrollAttendanceBatch(orgId, memberUserIds, month, opts.evaluateThrough);

  const overtimeMap = new Map<string, { saturday: number; sunday: number; holiday: number }>();
  const otRows = await db
    .select({
      userId: holidayWorkRequests.userId,
      type: holidayWorkRequests.type,
      eligibleDays:
        sql<number>`count(*) FILTER (WHERE COALESCE(${attendance.workHours}::numeric, 0) >= ${HOLIDAY_WORK_FULL_DAY_HOURS})`.as(
          "eligible_days",
        ),
    })
    .from(holidayWorkRequests)
    .leftJoin(
      attendance,
      and(
        eq(attendance.userId, holidayWorkRequests.userId),
        eq(attendance.orgId, holidayWorkRequests.orgId),
        eq(attendance.date, holidayWorkRequests.requestDate),
      ),
    )
    .where(
      and(
        eq(holidayWorkRequests.orgId, orgId),
        inArray(holidayWorkRequests.userId, memberUserIds),
        eq(holidayWorkRequests.status, "APPROVED"),
        eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
        ne(holidayWorkRequests.type, "SATURDAY"),
        gte(holidayWorkRequests.requestDate, monthStart),
        lte(holidayWorkRequests.requestDate, monthEnd),
      ),
    )
    .groupBy(holidayWorkRequests.userId, holidayWorkRequests.type);
  for (const r of otRows) {
    const days = Number(r.eligibleDays) || 0;
    const current = overtimeMap.get(r.userId) ?? { saturday: 0, sunday: 0, holiday: 0 };
    if (r.type === "HOLIDAY") current.holiday += days;
    else if (r.type === "SUNDAY") current.sunday += days;
    else if (r.type === "SATURDAY") current.saturday += days;
    overtimeMap.set(r.userId, current);
  }

  const activeLoanMap = new Map<string, number>();
  const loans = await db.query.salaryLoans.findMany({
    where: and(
      eq(salaryLoans.orgId, orgId),
      inArray(salaryLoans.userId, memberUserIds),
      eq(salaryLoans.status, "ACTIVE"),
    ),
    orderBy: (t, { asc }) => [asc(t.userId), asc(t.createdAt)],
  });
  for (const loan of loans) {
    if (activeLoanMap.has(loan.userId)) continue;
    const total = loan.totalEmis ?? 0;
    const paid = loan.paidEmis ?? 0;
    if (total > 0 && paid < total) {
      activeLoanMap.set(loan.userId, parseFloat(loan.emiAmount ?? "0"));
    }
  }

  const newPayrolls = memberUserIds
    .filter((uId) => {
      if (existingPayrollUserIds.has(uId)) return false;
      const picked = pickSalaryStructureForPayrollMonth(structuresByUser.get(uId) ?? [], month);
      if (picked) return true;
      if ((monthlySalaryMap.get(uId) ?? 0) > 0) return true;
      return salaryMap.has(uId);
    })
    .map((uId) => {
      const picked = pickSalaryStructureForPayrollMonth(structuresByUser.get(uId) ?? [], month);
      const salary = picked ?? salaryMap.get(uId);

      const ptAmount = PROFESSIONAL_TAX_INR;
      const structureDeductions = parseFloat(salary?.deductions ?? "0");

      const targetCtc = resolvePayrollMonthlyCtc({
        picked,
        fallbackStructure: salaryMap.get(uId) ?? null,
        employeeMonthlySalary: monthlySalaryMap.get(uId) ?? 0,
      });
      const earnings = splitMonthlyCtc505025(targetCtc);
      const basicSalary = earnings.basicSalary;
      const hra = earnings.hra;
      const specialAllowance = earnings.specialAllowance;
      const ctcMonthly = roundInr(targetCtc);
      const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;

      const att = strictAttendance.get(uId);
      const lopDays = att?.lopDays ?? 0;
      const paidLeaveDays = att?.paidLeaveDays ?? 0;

      const lopAmount = roundInr(dailyRate * lopDays);

      const saturdayMult = parseFloat(salary?.saturdayOtMultiplier ?? "1.00");
      const sundayMult = parseFloat(salary?.sundayOtMultiplier ?? "2.00");
      const holidayMult = parseFloat(salary?.holidayOtMultiplier ?? "2.00");
      const otBuckets = overtimeMap.get(uId) ?? { saturday: 0, sunday: 0, holiday: 0 };
      const overtimeDays = otBuckets.saturday + otBuckets.sunday + otBuckets.holiday;
      const overtimeAmount = roundInr(
        dailyRate *
          (otBuckets.saturday * saturdayMult +
            otBuckets.sunday * sundayMult +
            otBuckets.holiday * holidayMult),
      );

      const advanceRecoveryAmount = activeLoanMap.get(uId) ?? 0;

      const override = opts.overrides?.[uId];
      const bonusAmount = override?.bonus ?? 0;
      const otherDeductionsAmount = override?.otherDeductions ?? 0;

      const grossSalary = roundInr(
        basicSalary + hra + specialAllowance + overtimeAmount + bonusAmount,
      );

      const statutory = computeStatutory(basicSalary, grossSalary, {
        pfApplicable: salary?.pfApplicable ?? false,
        pfEmployeeRate: parseFloat(salary?.pfEmployeeRate ?? "12"),
        pfEmployerRate: parseFloat(salary?.pfEmployerRate ?? "12"),
        pfWageCeiling: parseFloat(salary?.pfWageCeiling ?? "15000"),
        esiApplicable: salary?.esiApplicable ?? false,
        esiEmployeeRate: parseFloat(salary?.esiEmployeeRate ?? "0.75"),
        esiEmployerRate: parseFloat(salary?.esiEmployerRate ?? "3.25"),
        esiWageCeiling: parseFloat(salary?.esiWageCeiling ?? "21000"),
      });

      const deductionsBeforeRecovery =
        lopAmount +
        ptAmount +
        structureDeductions +
        statutory.pfEmployee +
        statutory.esiEmployee +
        otherDeductionsAmount;
      const recoverableLoan = Math.max(
        0,
        Math.min(advanceRecoveryAmount, grossSalary - deductionsBeforeRecovery),
      );

      const totalDeductions = roundInr(deductionsBeforeRecovery + recoverableLoan);
      const netSalary = Math.max(0, roundInr(grossSalary - totalDeductions));

      return {
        orgId,
        userId: uId,
        month,
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        specialAllowance: specialAllowance.toString(),
        allowances: bonusAmount.toString(),
        lopDays: lopDays.toString(),
        lopAmount: lopAmount.toString(),
        halfDays: "0",
        halfDayAmount: "0",
        ptAmount: ptAmount.toString(),
        pfEmployee: statutory.pfEmployee.toString(),
        pfEmployer: statutory.pfEmployer.toString(),
        esiEmployee: statutory.esiEmployee.toString(),
        esiEmployer: statutory.esiEmployer.toString(),
        advanceRecoveryAmount: roundInr(recoverableLoan).toString(),
        otherDeductions: otherDeductionsAmount.toString(),
        structureDeductions: structureDeductions.toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        status: "DRAFT" as const,
        generatedBy,
        overtimeType: overtimeDays > 0 ? "days" : null,
        overtimeDays: overtimeDays.toString(),
        overtimeAmount: overtimeAmount.toString(),
        leaveDaysDisplay: paidLeaveDays.toString(),
      };
    });

  if (newPayrolls.length === 0) return { generated: 0, payrollIds: [] };

  const inserted = await db
    .insert(payrolls)
    .values(newPayrolls)
    .onConflictDoNothing({
      target: [payrolls.orgId, payrolls.userId, payrolls.month],
    })
    .returning({ id: payrolls.id });

  return { generated: inserted.length, payrollIds: inserted.map((r) => r.id) };
}
