import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  holidayWorkRequests,
  attendance,
  salaryLoans,
  users,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and, gte, lte, ne, sql } from "drizzle-orm";
import {
  calendarDaysInMonth,
  roundInr,
  PROFESSIONAL_TAX_INR,
  HOLIDAY_WORK_FULL_DAY_HOURS,
  splitMonthlyCtc505025,
  computePayrollStatutory,
  computeTotalDeductionsAndNet,
} from "@/lib/hr/payroll-calculations";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";
import { getStrictPayrollAttendance } from "@/lib/hr/payroll-attendance";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getErrorMessage } from "@/lib/get-error-message";

const generateSinglePayrollSchema = z
  .object({
    userId: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    bonus: z.number().min(0).default(0),
    otherDeductions: z.number().min(0).default(0),
    /** Optional custom pay period within the same calendar month (YYYY-MM-DD). */
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((b) => (b.periodStart ? !!b.periodEnd : true) && (b.periodEnd ? !!b.periodStart : true), {
    message: "Both periodStart and periodEnd are required for a custom period.",
  })
  .refine(
    (b) =>
      !b.periodStart ||
      !b.periodEnd ||
      (b.periodStart.slice(0, 7) === b.month &&
        b.periodEnd.slice(0, 7) === b.month &&
        b.periodEnd >= b.periodStart),
    {
      message:
        "Custom period must fall within the selected month and end on or after its start.",
    },
  );

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, generateSinglePayrollSchema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!membership) {
      return err("Employee not found in this organization.", 404);
    }

    const activeSalary = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, body.userId),
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.isActive, true)
      ),
    });

    let employeeMonthlySalary = 0;
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { monthlySalary: true },
    });
    const parsedMonthlySalary = parseFloat(userRow?.monthlySalary ?? "0");
    employeeMonthlySalary = Number.isFinite(parsedMonthlySalary) ? parsedMonthlySalary : 0;

    const monthLastDay = calendarDaysInMonth(body.month);
    const monthEndStr = `${body.month}-${String(monthLastDay).padStart(2, "0")}`;
    const monthStartStr = `${body.month}-01`;
    const overlappingStructures = await db.query.salaryStructures.findMany({
      where: and(
        eq(salaryStructures.userId, body.userId),
        eq(salaryStructures.orgId, session.orgId),
        sql`${salaryStructures.effectiveFrom} <= ${monthEndStr}`,
        sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStartStr})`
      ),
      orderBy: [salaryStructures.effectiveFrom],
    });

    const picked = pickSalaryStructureForPayrollMonth(overlappingStructures, body.month);
    const salary = picked ?? activeSalary;

    if (!picked && employeeMonthlySalary <= 0) {
      return err(
        "No salary structure applies to this month and no monthly salary is set. " +
          "Add a salary structure with an effective date on or before this month, or set monthly salary on the employee.",
        400
      );
    }

    const existingPayroll = await db.query.payrolls.findFirst({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.userId, body.userId),
        eq(payrolls.month, body.month)
      ),
      columns: { id: true, status: true },
    });
    if (existingPayroll) {
      return err(
        `Payroll for ${body.month} already exists (id: ${existingPayroll.id}, status: ${existingPayroll.status}). Delete the existing DRAFT first.`,
        409
      );
    }

    const monthStart = monthStartStr;
    const monthEnd = monthEndStr;

    const ptAmount = PROFESSIONAL_TAX_INR;
    const structureDeductions = parseFloat(salary?.deductions ?? "0");

    const calDays = calendarDaysInMonth(body.month);
    const targetCtc = resolvePayrollMonthlyCtc({
      picked,
      fallbackStructure: activeSalary ?? null,
      employeeMonthlySalary,
    });
    const earnings = splitMonthlyCtc505025(targetCtc);
    const basicSalary = earnings.basicSalary;
    const hra = earnings.hra;
    const specialAllowance = earnings.specialAllowance;
    const ctcMonthly = roundInr(targetCtc);
    const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;

    const sundayMult = parseFloat(salary?.sundayOtMultiplier ?? "2.00");
    const holidayMult = parseFloat(salary?.holidayOtMultiplier ?? "2.00");

    const approvedHwrs = await db.query.holidayWorkRequests.findMany({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, body.userId),
        eq(holidayWorkRequests.status, "APPROVED"),
        eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
        ne(holidayWorkRequests.type, "SATURDAY"),
        gte(holidayWorkRequests.requestDate, monthStart),
        lte(holidayWorkRequests.requestDate, monthEnd)
      ),
      columns: { id: true, requestDate: true, type: true },
    });

    const attendanceByDate = new Map<string, string | null>();
    if (approvedHwrs.length > 0) {
      const monthAttendance = await db.query.attendance.findMany({
        where: and(
          eq(attendance.userId, body.userId),
          eq(attendance.orgId, session.orgId),
          gte(attendance.date, monthStart),
          lte(attendance.date, monthEnd)
        ),
        columns: { date: true, workHours: true },
      });
      for (const row of monthAttendance) {
        attendanceByDate.set(row.date, row.workHours);
      }
    }

    let overtimeDays = 0;
    let overtimeAmountUnrounded = 0;
    for (const hwr of approvedHwrs) {
      const workHours = attendanceByDate.get(hwr.requestDate) ?? "0";
      if (parseFloat(workHours ?? "0") >= HOLIDAY_WORK_FULL_DAY_HOURS) {
        overtimeDays++;
        const mult = hwr.type === "HOLIDAY" ? holidayMult : sundayMult;
        overtimeAmountUnrounded += dailyRate * mult;
      }
    }
    const overtimeAmount = roundInr(overtimeAmountUnrounded);

    const activeLoan = await db.query.salaryLoans.findFirst({
      where: and(
        eq(salaryLoans.orgId, session.orgId),
        eq(salaryLoans.userId, body.userId),
        eq(salaryLoans.status, "ACTIVE")
      ),
      columns: { emiAmount: true, paidEmis: true, totalEmis: true },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    const loanHasBalance =
      activeLoan != null &&
      (activeLoan.totalEmis ?? 0) > 0 &&
      (activeLoan.paidEmis ?? 0) < (activeLoan.totalEmis ?? 0);
    const advanceRecoveryAmount = loanHasBalance ? parseFloat(activeLoan!.emiAmount ?? "0") : 0;

    const grossSalary = roundInr(basicSalary + hra + specialAllowance + overtimeAmount + (body.bonus || 0));

    const evaluateThrough =
      body.periodEnd && body.periodEnd < monthEndStr ? body.periodEnd : undefined;
    const att = await getStrictPayrollAttendance(
      session.orgId,
      body.userId,
      body.month,
      evaluateThrough,
    );

    const noAttendanceData =
      att.workingDays > 0 &&
      att.fullPresentDays === 0 &&
      att.paidLeaveDays === 0;
    if (noAttendanceData) {
      att.lopDays = 0;
    }

    const statutory = computePayrollStatutory({
      basicSalary,
      ctcMonthly,
      grossSalary,
      overtimeAmount,
      month: body.month,
      lopDays: att.lopDays,
      params: {
        pfApplicable: salary?.pfApplicable ?? false,
        pfEmployeeRate: parseFloat(salary?.pfEmployeeRate ?? "12"),
        pfEmployerRate: parseFloat(salary?.pfEmployerRate ?? "12"),
        pfWageCeiling: parseFloat(salary?.pfWageCeiling ?? "15000"),
        esiApplicable: salary?.esiApplicable ?? false,
        esiEmployeeRate: parseFloat(salary?.esiEmployeeRate ?? "0.75"),
        esiEmployerRate: parseFloat(salary?.esiEmployerRate ?? "3.25"),
        esiWageCeiling: parseFloat(salary?.esiWageCeiling ?? "21000"),
      },
    });

    const { lopDeduction, recoveredLoan, totalDeductions, netSalary } =
      computeTotalDeductionsAndNet({
        month: body.month,
        monthlySalary: ctcMonthly,
        grossSalary,
        salaryStructureDeductions: structureDeductions,
        lopDays: att.lopDays,
        otherDeductions: body.otherDeductions || 0,
        professionalTax: ptAmount,
        pfEmployee: statutory.pfEmployee,
        esiEmployee: statutory.esiEmployee,
        advanceRecoveryAmount,
      });
    const lopAmount = lopDeduction;

    let payroll;
    try {
      [payroll] = await db
        .insert(payrolls)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          month: body.month,
          basicSalary: basicSalary.toString(),
          hra: hra.toString(),
          specialAllowance: specialAllowance.toString(),
          allowances: (body.bonus || 0).toString(),
          lopDays: att.lopDays.toString(),
          lopAmount: lopAmount.toString(),
          halfDays: "0",
          halfDayAmount: "0",
          ptAmount: ptAmount.toString(),
          pfEmployee: statutory.pfEmployee.toString(),
          pfEmployer: statutory.pfEmployer.toString(),
          esiEmployee: statutory.esiEmployee.toString(),
          esiEmployer: statutory.esiEmployer.toString(),
          advanceRecoveryAmount: recoveredLoan.toString(),
          otherDeductions: (body.otherDeductions || 0).toString(),
          structureDeductions: structureDeductions.toString(),
          deductions: totalDeductions.toString(),
          grossSalary: grossSalary.toString(),
          netSalary: netSalary.toString(),
          status: "DRAFT",
          generatedBy: session.user.id,
          overtimeType: overtimeDays > 0 ? "days" : undefined,
          overtimeDays: overtimeDays.toString(),
          overtimeAmount: overtimeAmount.toString(),
          leaveDaysDisplay: att.paidLeaveDays.toString(),
        })
        .returning();
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes("uniq_payroll_org_user_month") || message.includes("duplicate key")) {
        return err("Payroll already exists for this employee and month.", 409);
      }
      throw error;
    }

    void createAuditLog({
      action: "hr.payroll_generated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payroll.id),
      targetType: "payroll",
      metadata: { employeeId: body.userId, month: body.month, netSalary },
    }).catch(() => {});

    return ok({ success: true, payrollId: payroll.id });
  });
}
