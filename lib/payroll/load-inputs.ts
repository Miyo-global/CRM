import "server-only";

import { db } from "@/lib/db";
import {
  attendance,
  holidayWorkRequests,
  resignations,
  salaryLoans,
  salaryStructures,
  users,
} from "@/lib/db/schema";
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { HOLIDAY_WORK_FULL_DAY_HOURS } from "@/lib/hr/payroll-calculations";
import { getStrictPayrollAttendanceBatch } from "@/lib/hr/payroll-attendance";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";
import { daysInMonth, emiDueFor, otMultiplier, perDayRate, professionalTaxFromStored, round2 } from "./rules";
import type { PayrollComputeInput } from "./compute";

export function todayIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
}

export interface LoadPayrollInputsOptions {
  orgId: string;
  userIds: string[];
  /** YYYY-MM */
  month: string;
  /** Per-employee manual overrides from the generate form. */
  overrides?: Record<string, { bonus?: number; otherDeductions?: number }>;
  /** Custom period end (YYYY-MM-DD) within the month. */
  evaluateThrough?: string;
}

/**
 * Gather every input `computePayroll` needs, for one or many employees.
 *
 * The preview endpoint, the per-employee generate route and the org-wide run
 * all go through here, so a previewed breakdown is the breakdown that is saved
 * (A3) and the Generate dialog shows the same LOP (A4).
 */
export async function loadPayrollInputs(
  opts: LoadPayrollInputsOptions,
): Promise<Map<string, PayrollComputeInput>> {
  const out = new Map<string, PayrollComputeInput>();
  if (opts.userIds.length === 0) return out;

  const calDays = daysInMonth(opts.month);
  const monthStart = `${opts.month}-01`;
  const monthEnd = `${opts.month}-${String(calDays).padStart(2, "0")}`;
  const today = todayIst();

  const [userRows, overlappingStructures, activeStructures, hwrRows, loanRows, exitRows, att] =
    await Promise.all([
      db
        .select({ id: users.id, monthlySalary: users.monthlySalary, joiningDate: users.joiningDate })
        .from(users)
        .where(inArray(users.id, opts.userIds)),
      db.query.salaryStructures.findMany({
        where: and(
          eq(salaryStructures.orgId, opts.orgId),
          inArray(salaryStructures.userId, opts.userIds),
          sql`${salaryStructures.effectiveFrom} <= ${monthEnd}`,
          sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStart})`,
        ),
        orderBy: [salaryStructures.effectiveFrom],
      }),
      db.query.salaryStructures.findMany({
        where: and(
          eq(salaryStructures.orgId, opts.orgId),
          inArray(salaryStructures.userId, opts.userIds),
          eq(salaryStructures.isActive, true),
        ),
      }),
      db.query.holidayWorkRequests.findMany({
        where: and(
          eq(holidayWorkRequests.orgId, opts.orgId),
          inArray(holidayWorkRequests.userId, opts.userIds),
          eq(holidayWorkRequests.status, "APPROVED"),
          eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
          ne(holidayWorkRequests.type, "SATURDAY"),
          gte(holidayWorkRequests.requestDate, monthStart),
          lte(holidayWorkRequests.requestDate, monthEnd),
        ),
        columns: { userId: true, requestDate: true, type: true },
      }),
      db.query.salaryLoans.findMany({
        where: and(
          eq(salaryLoans.orgId, opts.orgId),
          inArray(salaryLoans.userId, opts.userIds),
          eq(salaryLoans.status, "ACTIVE"),
        ),
        columns: { userId: true, amount: true, emiAmount: true, paidEmis: true, totalEmis: true },
      }),
      db
        .select({ userId: resignations.userId, lastWorkingDate: resignations.lastWorkingDate })
        .from(resignations)
        .where(
          and(
            eq(resignations.orgId, opts.orgId),
            inArray(resignations.userId, opts.userIds),
            inArray(resignations.status, ["APPROVED", "COMPLETED"]),
          ),
        ),
      getStrictPayrollAttendanceBatch(opts.orgId, opts.userIds, opts.month, opts.evaluateThrough),
    ]);

  const hwrUserIds = [...new Set(hwrRows.map((r) => r.userId))];
  const attendanceHours = new Map<string, number>();
  if (hwrUserIds.length > 0) {
    const rows = await db
      .select({ userId: attendance.userId, date: attendance.date, workHours: attendance.workHours })
      .from(attendance)
      .where(
        and(
          eq(attendance.orgId, opts.orgId),
          inArray(attendance.userId, hwrUserIds),
          gte(attendance.date, monthStart),
          lte(attendance.date, monthEnd),
        ),
      );
    for (const row of rows) {
      attendanceHours.set(`${row.userId}:${row.date}`, parseFloat(String(row.workHours ?? "0")) || 0);
    }
  }

  const exitByUser = new Map<string, string>();
  for (const row of exitRows) {
    const date = row.lastWorkingDate?.slice(0, 10);
    if (!date) continue;
    const existing = exitByUser.get(row.userId);
    if (!existing || date < existing) exitByUser.set(row.userId, date);
  }

  const structuresByUser = new Map<string, typeof overlappingStructures>();
  for (const s of overlappingStructures) {
    const list = structuresByUser.get(s.userId) ?? [];
    list.push(s);
    structuresByUser.set(s.userId, list);
  }

  for (const userId of opts.userIds) {
    const user = userRows.find((u) => u.id === userId);
    const picked = pickSalaryStructureForPayrollMonth(structuresByUser.get(userId) ?? [], opts.month);
    const active = activeStructures.find((s) => s.userId === userId) ?? null;
    const structure = picked ?? active;
    const monthlySalary = resolvePayrollMonthlyCtc({
      picked,
      fallbackStructure: active,
      employeeMonthlySalary: parseFloat(user?.monthlySalary ?? "0") || 0,
    });

    const perDay = perDayRate(monthlySalary);
    const sundayMult = otMultiplier(structure?.sundayOtMultiplier);
    const holidayMult = otMultiplier(structure?.holidayOtMultiplier);
    let overtimeDays = 0;
    let overtimeAmount = 0;
    for (const hwr of hwrRows) {
      if (hwr.userId !== userId) continue;
      if ((attendanceHours.get(`${userId}:${hwr.requestDate}`) ?? 0) < HOLIDAY_WORK_FULL_DAY_HOURS) continue;
      overtimeDays++;
      overtimeAmount += perDay * (hwr.type === "HOLIDAY" ? holidayMult : sundayMult);
    }

    const loan = loanRows.find(
      (l) =>
        l.userId === userId &&
        (l.totalEmis ?? 0) > 0 &&
        (l.paidEmis ?? 0) < (l.totalEmis ?? 0),
    );

    const attendanceForUser = att.get(userId);

    out.set(userId, {
      month: opts.month,
      monthlySalary,
      joiningDate: user?.joiningDate ?? null,
      exitDate: exitByUser.get(userId) ?? null,
      todayIst: today,
      lopDays: attendanceForUser?.lopDays ?? 0,
      paidLeaveDays: attendanceForUser?.paidLeaveDays ?? 0,
      overtimeDays,
      overtimeAmount: round2(overtimeAmount),
      bonus: opts.overrides?.[userId]?.bonus ?? 0,
      otherDeductions: opts.overrides?.[userId]?.otherDeductions ?? 0,
      structureDeductions: parseFloat(structure?.deductions ?? "0") || 0,
      advanceRecoveryAmount: loan ? emiDueFor(loan) : 0,
      statutory: structure
        ? {
            pfApplicable: structure.pfApplicable ?? false,
            pfEmployeeRate: parseFloat(structure.pfEmployeeRate ?? "12"),
            pfEmployerRate: parseFloat(structure.pfEmployerRate ?? "12"),
            pfWageCeiling: parseFloat(structure.pfWageCeiling ?? "15000"),
            esiApplicable: structure.esiApplicable ?? false,
            esiEmployeeRate: parseFloat(structure.esiEmployeeRate ?? "0.75"),
            esiEmployerRate: parseFloat(structure.esiEmployerRate ?? "3.25"),
            esiWageCeiling: parseFloat(structure.esiWageCeiling ?? "21000"),
          }
        : undefined,
      // Per-employee PT from the salary structure; NULL = not applicable.
      professionalTax: professionalTaxFromStored(structure?.professionalTax),
    });
  }

  return out;
}
