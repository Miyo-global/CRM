import { db } from "@/lib/db";
import { leaveRequests, leaveTypes } from "@/lib/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { leaveDaysOverlappingMonth } from "@/lib/hr/leave-days-overlap";
import { PAYROLL_EXCLUDED_LEAVE_STATUS } from "@/lib/hr/payroll-calculations";

export { leaveDaysOverlappingMonth } from "@/lib/hr/leave-days-overlap";

const COMP_OFF_TYPE_NAME = "Compensatory Off";

export async function countApprovedLeaveDaysInMonth(
  orgId: string,
  userId: string,
  monthYyyyMm: string
): Promise<number> {
  const { calendarDaysInMonth } = await import("@/lib/hr/payroll-calculations");
  const last = calendarDaysInMonth(monthYyyyMm);
  const monthStartStr = `${monthYyyyMm}-01`;
  const monthEndStr = `${monthYyyyMm}-${String(last).padStart(2, "0")}`;

  const rows = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.userId, userId),
      ne(leaveRequests.status, PAYROLL_EXCLUDED_LEAVE_STATUS),
      lte(leaveRequests.startDate, monthEndStr),
      gte(leaveRequests.endDate, monthStartStr)
    ),
    columns: { startDate: true, endDate: true, isHalfDay: true, leaveTypeId: true },
  });

  const compOffType = await db.query.leaveTypes.findFirst({
    where: and(eq(leaveTypes.orgId, orgId), eq(leaveTypes.name, COMP_OFF_TYPE_NAME)),
    columns: { id: true },
  });

  let total = 0;
  for (const r of rows) {
    if (compOffType && r.leaveTypeId === compOffType.id) continue;
    total += leaveDaysOverlappingMonth(r.startDate, r.endDate, monthYyyyMm, r.isHalfDay);
  }
  return Math.round(total * 100) / 100;
}
