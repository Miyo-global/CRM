/**
 * Read-only payslip generator — SELECTs from DB only, writes PDFs to disk.
 *
 * Leave rule (MONTHLY_FREE_LEAVE_DAYS = 1):
 *   1 approved leave day  → 1 casual (paid) leave, 0 LOP from leave
 *   2 approved leave days → 1 casual + 1 LOP
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/generate-payslips-from-db.ts [YYYY-MM] [employeeId ...]
 */
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import { db } from "../lib/db";
import {
  users,
  organizations,
  organizationMembers,
  salaryStructures,
  attendance,
  holidays,
  leaveRequests,
} from "../lib/db/schema";
import { eq, and, sql, desc, gte, lte, isNotNull, ne } from "drizzle-orm";
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
import { countApprovedLeaveDaysInMonth } from "../server/queries/hr/payslip-leave-days";
import { manualPayslipBodyToPdfData, manualPayslipPdfBodySchema } from "../lib/hr/manual-payslip-pdf";
import { generatePayslipPdf } from "../lib/payslip-pdf-core";

const TARGET_MONTH = process.argv[2]?.match(/^\d{4}-\d{2}$/) ? process.argv[2] : "2026-04";
const EMPLOYEE_ID_FILTER = process.argv.slice(3).filter((a) => !a.startsWith("--"));
const ORG_FULL_NAME = "Miyo Global";

type SalaryStructureRow = NonNullable<
  Awaited<ReturnType<typeof db.query.salaryStructures.findFirst>>
>;

async function loadSalaryStructure(
  orgId: string,
  userId: string,
  monthStart: string,
  monthEnd: string,
  month: string
): Promise<SalaryStructureRow | null> {
  try {
    const activeSalary = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, userId),
        eq(salaryStructures.orgId, orgId),
        eq(salaryStructures.isActive, true)
      ),
    });
    const overlappingStructures = await db.query.salaryStructures.findMany({
      where: and(
        eq(salaryStructures.userId, userId),
        eq(salaryStructures.orgId, orgId),
        sql`${salaryStructures.effectiveFrom} <= ${monthEnd}`,
        sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStart})`
      ),
      orderBy: [salaryStructures.effectiveFrom],
    });
    return pickSalaryStructureForPayrollMonth(overlappingStructures, month) ?? activeSalary ?? null;
  } catch {
    return null;
  }
}

function monthBounds(month: string): { start: string; end: string } {
  const calDays = calendarDaysInMonth(month);
  return { start: `${month}-01`, end: `${month}-${String(calDays).padStart(2, "0")}` };
}

function todayIstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
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

/** Read-only attendance + leave split (1 free casual leave / month; extra → LOP). */
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

async function main() {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      address: organizations.address,
    })
    .from(organizations)
    .limit(1);
  if (!org) throw new Error("No organization found");

  const monthStart = `${TARGET_MONTH}-01`;
  const monthLastDay = calendarDaysInMonth(TARGET_MONTH);
  const monthEnd = `${TARGET_MONTH}-${String(monthLastDay).padStart(2, "0")}`;

  let employeeQuery = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      employeeId: users.employeeId,
      designation: users.designation,
      monthlySalary: users.monthlySalary,
      taxId: users.taxId,
      joiningDate: users.joiningDate,
      bankDetails: users.bankDetails,
    })
    .from(users)
    .innerJoin(
      organizationMembers,
      and(eq(organizationMembers.userId, users.id), eq(organizationMembers.orgId, org.id))
    )
    .where(and(eq(users.isActive, true), sql`cast(${users.monthlySalary} as numeric) > 0`))
    .orderBy(desc(users.employeeId));

  const candidates = await employeeQuery;
  const filtered =
    EMPLOYEE_ID_FILTER.length > 0
      ? candidates.filter((c) => c.employeeId && EMPLOYEE_ID_FILTER.includes(c.employeeId))
      : candidates;

  if (filtered.length === 0) {
    console.error("No matching employees. Pass month (YYYY-MM) and optional employee IDs.");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "generated", "payslips", TARGET_MONTH);
  await fs.mkdir(outDir, { recursive: true });

  const report: Record<string, unknown>[] = [];

  for (const emp of filtered) {
    const att = await fetchStrictAttendance(org.id, emp.id, TARGET_MONTH);
    const approvedLeaveDays = await countApprovedLeaveDaysInMonth(org.id, emp.id, TARGET_MONTH);

    const activeSalary = await loadSalaryStructure(org.id, emp.id, monthStart, monthEnd, TARGET_MONTH);
    const pickedStructure = activeSalary;
    const salary = pickedStructure;

    const employeeMonthlySalary = parseFloat(emp.monthlySalary ?? "0") || 0;
    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructure ?? null,
      fallbackStructure: activeSalary,
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

    const bank = emp.bankDetails;
    const orgAddress = org.address;
    const addressLine = [orgAddress?.city, orgAddress?.state, orgAddress?.country].filter(Boolean).join(", ");

    const body = manualPayslipPdfBodySchema.parse({
      month: TARGET_MONTH,
      orgName: ORG_FULL_NAME,
      orgShortName: org.name ?? "Miyo Global",
      orgAddress: addressLine || "Hyderabad, Telangana, India",
      employeeName: emp.name ?? "Employee",
      employeeId: emp.employeeId ?? undefined,
      designation: emp.designation ?? undefined,
      panNumber: emp.taxId ?? undefined,
      bankName: bank?.bankName,
      bankAccountDisplay: bank?.accountNumber ? String(bank.accountNumber).trim() : undefined,
      bankBranch: bank?.branch,
      ifsc: bank?.ifsc,
      joiningDateDisplay: emp.joiningDate
        ? format(new Date(emp.joiningDate), "dd-MM-yyyy")
        : undefined,
      basicSalary,
      hra,
      allowances: specialAllowance,
      professionalTax: ptAmount,
      pfEmployee: statutory.pfEmployee,
      esiEmployee: statutory.esiEmployee,
      lopDays: att.lopDays,
      leaveDaysInMonth: approvedLeaveDays,
      lopDeductionAmount: lopDeduction,
      grossSalary,
      deductions: totalDeductions,
      netSalary,
      showPaidBadge: true,
    });

    const pdfData = manualPayslipBodyToPdfData(body);
    const buffer = await generatePayslipPdf(pdfData);
    const safeName = (emp.name ?? "employee").replace(/\s+/g, "-");
    const pdfPath = path.join(outDir, `Payslip-${safeName}-${TARGET_MONTH}.pdf`);
    await fs.writeFile(pdfPath, buffer);

    const leaveNote =
      approvedLeaveDays <= 1
        ? `${approvedLeaveDays} leave → ${att.paidLeaveDays} casual (paid)`
        : `${approvedLeaveDays} leaves → 1 casual + ${Math.max(0, approvedLeaveDays - 1)} excess (LOP component in attendance)`;

    report.push({
      employee: emp.name,
      employeeId: emp.employeeId,
      designation: emp.designation,
      email: emp.email,
      month: TARGET_MONTH,
      pdf: pdfPath,
      monthlyCtc: ctcMonthly,
      grossSalary,
      netSalary,
      leaveBreakdown: {
        approvedLeaveDays,
        paidCasualLeaveDays: att.paidLeaveDays,
        lopDays: att.lopDays,
        note: leaveNote,
      },
      attendanceSummary: att,
      payrollBreakdown: {
        basicSalary,
        hra,
        specialAllowance,
        lopDeduction,
        professionalTax: ptAmount,
        pfEmployee: statutory.pfEmployee,
        esiEmployee: statutory.esiEmployee,
        totalDeductions,
      },
    });

    console.log(`\n✓ ${emp.name} (${emp.employeeId ?? emp.id})`);
    console.log(`  PDF: ${pdfPath}`);
    console.log(
      `  Leaves: ${approvedLeaveDays} approved → ${att.paidLeaveDays} casual paid, ${att.lopDays} LOP`
    );
    console.log(`  Net: ₹${netSalary.toLocaleString("en-IN")}`);
  }

  const reportPath = path.join(outDir, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);
  console.log(`Generated ${report.length} payslip(s) (read-only — no DB writes)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
