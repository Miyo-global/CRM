import "server-only";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { calculateLeaveWorkingDays } from "@/lib/validations/leave-request";
import { holidayDatesInRange } from "@/lib/hr/leave-working-days-server";
import { getCasualMonthlyCapError } from "@/server/actions/leave-actions/leave-balance";
import { isUnpaidLeaveType, LEAVE_POLICY } from "@/lib/leave-policy";

export interface LeaveRequestCheckInput {
  orgId: string;
  userId: string;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}

export interface LeaveRequestCheck {
  /** Working days the request consumes, holidays and Sundays excluded. */
  requestedDays: number;
  /** Balance before this request (unpaid types report 0). */
  available: number;
  /** Balance once the request is approved, or null for an unpaid type. */
  balanceAfter: number | null;
  /** Why the request would be rejected, or null when it would be accepted. */
  error: string | null;
  /** The leave type's name, for labels and emails. */
  leaveTypeName: string | null;
}

/**
 * The single decision the leave form previews and the POST route enforces.
 *
 * The form used to preview from the raw balance alone, so it promised "8 days
 * left" and the server then rejected the request over the monthly casual cap
 * or leave already approved (QA-0050).
 */
export async function checkLeaveRequest(
  input: LeaveRequestCheckInput,
): Promise<LeaveRequestCheck> {
  const start = input.startDate.slice(0, 10);
  const end = input.endDate.slice(0, 10);

  if (start > end) {
    return {
      requestedDays: 0,
      available: 0,
      balanceAfter: null,
      error: "Start date must be before or equal to end date.",
      leaveTypeName: null,
    };
  }

  const holidays = await holidayDatesInRange(input.orgId, start, end);
  const requestedDays = calculateLeaveWorkingDays({
    startDate: start,
    endDate: end,
    isHalfDay: input.isHalfDay,
    holidays,
  });

  const [balance, leaveType] = await Promise.all([
    db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.userId, input.userId),
        eq(leaveBalances.orgId, input.orgId),
        eq(leaveBalances.leaveTypeId, input.leaveTypeId),
        eq(leaveBalances.year, new Date().getFullYear()),
      ),
    }),
    db.query.leaveTypes.findFirst({
      where: eq(leaveTypes.id, input.leaveTypeId),
      columns: { name: true },
    }),
  ]);

  const isUnpaid = isUnpaidLeaveType(leaveType?.name ?? "");
  const available = balance ? Number(balance.balance) : 0;

  if (!input.isHalfDay && requestedDays <= 0) {
    return {
      requestedDays,
      available,
      balanceAfter: isUnpaid ? null : available,
      error:
        "Leave cannot be requested for dates that are only Sundays or holidays. Select working days.",
      leaveTypeName: leaveType?.name ?? null,
    };
  }

  if (input.isHalfDay) {
    const dayIsWorking = calculateLeaveWorkingDays({
      startDate: start,
      endDate: start,
      isHalfDay: false,
      holidays,
    });
    if (dayIsWorking <= 0) {
      return {
        requestedDays,
        available,
        balanceAfter: isUnpaid ? null : available,
        error:
          "Half-day leave cannot be requested on a non-working day. Select a working day.",
        leaveTypeName: leaveType?.name ?? null,
      };
    }
  }

  if (!isUnpaid && available < requestedDays) {
    return {
      requestedDays,
      available,
      balanceAfter: available,
      error: `Insufficient leave balance. Available: ${available}, Required: ${requestedDays}`,
      leaveTypeName: leaveType?.name ?? null,
    };
  }

  if (leaveType?.name === LEAVE_POLICY.CASUAL.name) {
    const capError = await getCasualMonthlyCapError({
      orgId: input.orgId,
      userId: input.userId,
      casualTypeId: input.leaveTypeId,
      startDate: start,
      endDate: end,
      isHalfDay: input.isHalfDay,
    });
    if (capError) {
      return {
        requestedDays,
        available,
        balanceAfter: isUnpaid ? null : available,
        error: capError,
        leaveTypeName: leaveType?.name ?? null,
      };
    }
  }

  return {
    requestedDays,
    available,
    balanceAfter: isUnpaid ? null : available - requestedDays,
    error: null,
    leaveTypeName: leaveType?.name ?? null,
  };
}
