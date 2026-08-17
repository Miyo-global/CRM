import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { PAYSLIP_OUTPUT_DIR } from "@/lib/constants/paths";
import { db } from "../lib/db";
import {
  payrolls,
  users,
  organizations,
  organizationMembers,
  salaryStructures,
  attendance,
  holidays,
  leaveRequests,
} from "../lib/db/schema";
import { eq, and, sql, desc, isNotNull, gte, lte, ne } from "drizzle-orm";
import {
  calendarDaysInMonth,
  splitMonthlyCtc505025,
  computePayrollStatutory,
  computeTotalDeductionsAndNet,
  computeStrictAttendance,
  PAYROLL_EXCLUDED_LEAVE_STATUS,
  PROFESSIONAL_TAX_INR,
  roundInr,
  type LeaveCoverage,
  type StrictAttendanceResult,
} from "../lib/hr/payroll-calculations";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "../lib/hr/salary-effective-dates";
import {
  buildPayslipPdfDataFromPayroll,
  generatePayslipPdf,
} from "../lib/payslip-pdf-core";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

const TARGET_MONTH = process.argv[2] ?? "2026-04";
const COUNT = 4;

function monthBounds(month: string): { start: string; end: string } {
  const calDays = calendarDaysInMonth(month);
  return { start: `${month}-01`, end: `${month}-${String(calDays).padStart(2, "0")}` };
}

function todayIstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
}

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  for (let d = s; d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function fetchStrictAttendance(
  orgId: string,
  userId: string,
  month: string
): Promise<StrictAttendanceResult> {
  const { start, end } = monthBounds(month);
  const through = todayIstYmd();

  const [attendanceRows, holidayRows, leaveRows] = await Promise.all([
    db
      .select({ date: attendance.date, workHours: attendance.workHours })
      .from(attendance)
      .where(
        and(
          eq(attendance.orgId, orgId),
          eq(attendance.userId, userId),
          gte(attendance.date, start),
          lte(attendance.date, end),
          isNotNull(attendance.checkIn)
        )
      ),
    db
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(eq(holidays.orgId, orgId), gte(holidays.date, start), lte(holidays.date, end))),
    db
      .select({
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        isHalfDay: leaveRequests.isHalfDay,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, orgId),
          eq(leaveRequests.userId, userId),
          ne(leaveRequests.status, PAYROLL_EXCLUDED_LEAVE_STATUS),
          lte(leaveRequests.startDate, end),
          gte(leaveRequests.endDate, start)
        )
      ),
  ]);

  const workHoursByDate = new Map<string, number>();
  for (const row of attendanceRows) {
    const h = parseFloat(String(row.workHours ?? "0")) || 0;
    workHoursByDate.set(row.date, (workHoursByDate.get(row.date) ?? 0) + h);
  }

  const leaveByDate = new Map<string, LeaveCoverage>();
  for (const row of leaveRows) {
    const from = row.startDate > start ? row.startDate : start;
    const to = row.endDate < end ? row.endDate : end;
    for (const dateStr of eachDateInclusive(from, to)) {
      const coverage: LeaveCoverage = row.isHalfDay ? "HALF" : "FULL";
      const existing = leaveByDate.get(dateStr);
      if (existing !== "FULL") leaveByDate.set(dateStr, coverage);
    }
  }

  return computeStrictAttendance({
    month,
    workHoursByDate,
    holidayDates: new Set(holidayRows.map((h) => h.date)),
    leaveByDate,
    evaluateThroughDate: through,
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const [org] = await db.select({ id: organizations.id, name: organizations.name }).from(organizations).limit(1);
  if (!org) throw new Error("No organization found");

  const monthStart = `${TARGET_MONTH}-01`;
  const monthEnd = `${TARGET_MONTH}-${String(calendarDaysInMonth(TARGET_MONTH)).padStart(2, "0")}`;

  const candidates = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      employeeId: users.employeeId,
      designation: users.designation,
      monthlySalary: users.monthlySalary,
      attCount: sql<number>`(
        SELECT count(*)::int FROM ${attendance}
        WHERE ${attendance.userId} = ${users.id}
          AND ${attendance.orgId} = ${org.id}
          AND ${attendance.date} >= ${monthStart}
          AND ${attendance.date} <= ${monthEnd}
          AND ${attendance.checkIn} IS NOT NULL
      )`,
    })
    .from(users)
    .innerJoin(organizationMembers, and(eq(organizationMembers.userId, users.id), eq(organizationMembers.orgId, org.id)))
    .where(and(eq(users.isActive, true), sql`cast(${users.monthlySalary} as numeric) > 0`))
    .orderBy(desc(sql`(
        SELECT count(*)::int FROM ${attendance}
        WHERE ${attendance.userId} = ${users.id}
          AND ${attendance.orgId} = ${org.id}
          AND ${attendance.date} >= ${monthStart}
          AND ${attendance.date} <= ${monthEnd}
          AND ${attendance.checkIn} IS NOT NULL
      )`));

  const withoutPayroll: typeof candidates = [];
  for (const c of candidates) {
    const existing = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.orgId, org.id), eq(payrolls.userId, c.id), eq(payrolls.month, TARGET_MONTH)),
      columns: { id: true },
    });
    if (!existing && (c.attCount ?? 0) > 0) withoutPayroll.push(c);
  }

  const picked = shuffle(withoutPayroll).slice(0, COUNT);
  if (picked.length < COUNT) {
    console.warn(`Only ${picked.length} eligible employees (need salary + attendance, no existing payroll for ${TARGET_MONTH})`);
  }
  if (picked.length === 0) {
    console.log("No eligible employees. Try another month or clear existing payrolls.");
    process.exit(1);
  }

  const outDir = path.join(PAYSLIP_OUTPUT_DIR, TARGET_MONTH);
  await fs.mkdir(outDir, { recursive: true });

  const report: Record<string, unknown>[] = [];

  for (const emp of picked) {
    const att = await fetchStrictAttendance(org.id, emp.id, TARGET_MONTH);

    const attRows = await db
      .select({
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workHours: attendance.workHours,
        status: attendance.status,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.orgId, org.id),
          eq(attendance.userId, emp.id),
          gte(attendance.date, monthStart),
          lte(attendance.date, monthEnd),
          isNotNull(attendance.checkIn)
        )
      )
      .orderBy(attendance.date);

    const activeSalary = await db.query.salaryStructures.findFirst({
      where: and(eq(salaryStructures.userId, emp.id), eq(salaryStructures.orgId, org.id), eq(salaryStructures.isActive, true)),
    });

    const monthLastDay = calendarDaysInMonth(TARGET_MONTH);
    const monthEndStr = `${TARGET_MONTH}-${String(monthLastDay).padStart(2, "0")}`;
    const overlappingStructures = await db.query.salaryStructures.findMany({
      where: and(
        eq(salaryStructures.userId, emp.id),
        eq(salaryStructures.orgId, org.id),
        sql`${salaryStructures.effectiveFrom} <= ${monthEndStr}`,
        sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStart})`
      ),
      orderBy: [salaryStructures.effectiveFrom],
    });
    const pickedStructure = pickSalaryStructureForPayrollMonth(overlappingStructures, TARGET_MONTH);
    const salary = pickedStructure ?? activeSalary;

    const employeeMonthlySalary = parseFloat(emp.monthlySalary ?? "0") || 0;
    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructure,
      fallbackStructure: activeSalary ?? null,
      employeeMonthlySalary,
    });
    const { basicSalary, hra, specialAllowance } = splitMonthlyCtc505025(targetCtc);
    const ctcMonthly = roundInr(targetCtc);
    const ptAmount = PROFESSIONAL_TAX_INR;
    const structureDeductions = parseFloat(salary?.deductions ?? "0");
    const grossSalary = roundInr(basicSalary + hra + specialAllowance);

    const statutory = computePayrollStatutory({
      basicSalary,
      ctcMonthly,
      grossSalary,
      overtimeAmount: 0,
      month: TARGET_MONTH,
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

    const { lopDeduction, totalDeductions, netSalary } = computeTotalDeductionsAndNet({
      month: TARGET_MONTH,
      monthlySalary: ctcMonthly,
      grossSalary,
      salaryStructureDeductions: structureDeductions,
      lopDays: att.lopDays,
      otherDeductions: 0,
      professionalTax: ptAmount,
      pfEmployee: statutory.pfEmployee,
      esiEmployee: statutory.esiEmployee,
      advanceRecoveryAmount: 0,
    });

    const [payroll] = await db
      .insert(payrolls)
      .values({
        orgId: org.id,
        userId: emp.id,
        month: TARGET_MONTH,
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        specialAllowance: specialAllowance.toString(),
        allowances: "0",
        lopDays: att.lopDays.toString(),
        lopAmount: lopDeduction.toString(),
        halfDays: "0",
        halfDayAmount: "0",
        ptAmount: ptAmount.toString(),
        pfEmployee: statutory.pfEmployee.toString(),
        pfEmployer: statutory.pfEmployer.toString(),
        esiEmployee: statutory.esiEmployee.toString(),
        esiEmployer: statutory.esiEmployer.toString(),
        advanceRecoveryAmount: "0",
        otherDeductions: "0",
        structureDeductions: structureDeductions.toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        status: "PAID",
        paidAt: new Date(),
        leaveDaysDisplay: att.paidLeaveDays.toString(),
        overtimeAmount: "0",
        overtimeDays: "0",
      })
      .returning();

    const employee = await db.query.users.findFirst({ where: eq(users.id, emp.id) });
    const pdfData = buildPayslipPdfDataFromPayroll(
      payroll,
      employee!,
      org,
      { leaveDaysInMonth: att.paidLeaveDays, showPaidBadge: true, orgFullNameOverride: "Miyo Global" }
    );
    const buffer = await generatePayslipPdf(pdfData);
    const safeName = (emp.name ?? "employee").replace(/\s+/g, "-");
    const pdfPath = path.join(outDir, `Payslip-${safeName}-${TARGET_MONTH}.pdf`);
    await fs.writeFile(pdfPath, buffer);

    report.push({
      employee: emp.name,
      employeeId: emp.employeeId,
      designation: emp.designation,
      email: emp.email,
      month: TARGET_MONTH,
      payrollId: payroll.id,
      monthlyCtc: ctcMonthly,
      grossSalary,
      netSalary,
      pdf: pdfPath,
      attendanceSummary: {
        calendarDays: att.calDays,
        workingDays: att.workingDays,
        weekendDays: att.weekendDays,
        holidayDays: att.holidayDays,
        fullPresentDays: att.fullPresentDays,
        paidLeaveDays: att.paidLeaveDays,
        lopDays: att.lopDays,
        checkInRecords: attRows.length,
      },
      dailyAttendance: attRows.map((r) => ({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        workHours: r.workHours,
        status: r.status,
      })),
      payrollBreakdown: {
        basicSalary,
        hra,
        specialAllowance,
        lopDeduction,
        professionalTax: ptAmount,
        pfEmployee: statutory.pfEmployee,
        esiEmployee: statutory.esiEmployee,
        structureDeductions,
        totalDeductions,
      },
    });

    console.log(`\n✓ ${emp.name} (${emp.employeeId}) — payroll #${payroll.id}, net ${CURRENCY_SYMBOL}${netSalary.toLocaleString(DEFAULT_LOCALE)}`);
    console.log(`  PDF: ${pdfPath}`);
    console.log(
      `  Attendance: ${att.fullPresentDays} present, ${att.paidLeaveDays} paid leave, ${att.lopDays} LOP (${attRows.length} check-ins logged)`
    );
  }

  const reportPath = path.join(outDir, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report: ${reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
