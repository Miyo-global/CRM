import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  holidayWorkRequests,
  attendance,
  salaryStructures,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, lte, ne, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { calendarDaysInMonth, HOLIDAY_WORK_FULL_DAY_HOURS } from "@/lib/hr/payroll-calculations";
import { getStrictPayrollAttendance } from "@/lib/hr/payroll-attendance";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can preview overtime.", 403);
    }

    const userId = req.nextUrl.searchParams.get("userId");
    const month = req.nextUrl.searchParams.get("month");

    if (!userId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return err("userId and month (YYYY-MM) are required.", 400);
    }

    const [yr, mo] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const lastDay = new Date(yr, mo, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [overlapping, activeSalary, userRow] = await Promise.all([
      db.query.salaryStructures.findMany({
        where: and(
          eq(salaryStructures.orgId, session.orgId),
          eq(salaryStructures.userId, userId),
          sql`${salaryStructures.effectiveFrom} <= ${monthEnd}`,
          sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStart})`
        ),
        orderBy: [salaryStructures.effectiveFrom],
      }),
      db.query.salaryStructures.findFirst({
        where: and(
          eq(salaryStructures.orgId, session.orgId),
          eq(salaryStructures.userId, userId),
          eq(salaryStructures.isActive, true)
        ),
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { monthlySalary: true },
      }),
    ]);

    const employeeMonthlySalary = parseFloat(userRow?.monthlySalary ?? "0");
    const picked = pickSalaryStructureForPayrollMonth(overlapping, month);

    const ctcMonthly = resolvePayrollMonthlyCtc({
      picked,
      fallbackStructure: activeSalary ?? null,
      employeeMonthlySalary,
    });

    const salary = picked ?? activeSalary;
    const sundayMult = parseFloat(salary?.sundayOtMultiplier ?? "2.00");
    const holidayMult = parseFloat(salary?.holidayOtMultiplier ?? "2.00");

    const approvedRequests = await db.query.holidayWorkRequests.findMany({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, userId),
        eq(holidayWorkRequests.status, "APPROVED"),
        eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
        ne(holidayWorkRequests.type, "SATURDAY"),
        gte(holidayWorkRequests.requestDate, monthStart),
        lte(holidayWorkRequests.requestDate, monthEnd)
      ),
      columns: { id: true, requestDate: true, type: true },
    });

    const eligibleDates: string[] = [];
    let overtimeMultiplierSum = 0;
    for (const req of approvedRequests) {
      const att = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, userId),
          eq(attendance.orgId, session.orgId),
          eq(attendance.date, req.requestDate)
        ),
        columns: { workHours: true },
      });
      const hours = parseFloat(att?.workHours ?? "0");
      if (hours >= HOLIDAY_WORK_FULL_DAY_HOURS) {
        eligibleDates.push(req.requestDate);
        overtimeMultiplierSum += req.type === "HOLIDAY" ? holidayMult : sundayMult;
      }
    }

    const calDays = calendarDaysInMonth(month);
    const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;
    const overtimeDays = eligibleDates.length;
    const overtimeAmount = Math.round(dailyRate * overtimeMultiplierSum);

    const strictAtt = await getStrictPayrollAttendance(session.orgId, userId, month);

    return ok({
      userId,
      month,
      overtimeDays,
      overtimeAmount,
      dailyRate: Math.round(dailyRate),
      eligibleDates,
      lopDays: strictAtt.lopDays,
      paidLeaveDays: strictAtt.paidLeaveDays,
      fullPresentDays: strictAtt.fullPresentDays,
      workingDays: strictAtt.workingDays,
      holidayDays: strictAtt.holidayDays,
      weekendDays: strictAtt.weekendDays,
    });
  });
}
