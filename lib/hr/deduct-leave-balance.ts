import "server-only";

import { db } from "@/lib/db";
import { leaveBalances, leaveRequests, leaveTypes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import { countLeaveWorkingDays } from "@/lib/hr/leave-working-days-server";

/** db or an open transaction — both satisfy the queries below. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export interface LeaveForDeduction {
  id: number;
  orgId: string;
  userId: string;
  leaveTypeId: number | null;
  startDate: string;
  endDate: string;
  isHalfDay: boolean | null;
}

/**
 * Deducts an approved leave from the matching balance and records the LOP days.
 *
 * Called for every leave that ends up APPROVED, whether a person approved it or
 * it was auto-approved on apply: the deduction used to live only in the approve
 * route, so an auto-approved leave was free (QA-0018).
 *
 * Returns the LOP days charged and the balance left, or nulls when the leave
 * type is unpaid or the user has no balance row for that year.
 */
export async function deductApprovedLeaveBalance(
  tx: Tx,
  leave: LeaveForDeduction,
): Promise<{ lopDays: number; balanceAfter: number | null }> {
  if (!leave.leaveTypeId) return { lopDays: 0, balanceAfter: null };

  const leaveType = await tx.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, leave.leaveTypeId),
    columns: { name: true },
  });
  if (leaveType?.name === LEAVE_POLICY.UNPAID.name) {
    return { lopDays: 0, balanceAfter: null };
  }

  const days = leave.isHalfDay
    ? 0.5
    : await countLeaveWorkingDays({
        orgId: leave.orgId,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });

  const leaveYear = Number(leave.startDate.slice(0, 4));
  const balanceRecord = await tx.query.leaveBalances.findFirst({
    where: and(
      eq(leaveBalances.userId, leave.userId),
      eq(leaveBalances.leaveTypeId, leave.leaveTypeId),
      eq(leaveBalances.year, leaveYear),
    ),
  });
  if (!balanceRecord) return { lopDays: 0, balanceAfter: null };

  const available = Number(balanceRecord.balance);
  const lopDays = available <= 0 ? days : Math.max(0, days - available);
  const paidDays = days - lopDays;
  const balanceAfter = Math.max(0, available - paidDays);

  await tx
    .update(leaveRequests)
    .set({ lopDays: lopDays.toString() })
    .where(eq(leaveRequests.id, leave.id));
  await tx
    .update(leaveBalances)
    .set({ balance: balanceAfter.toString() })
    .where(eq(leaveBalances.id, balanceRecord.id));

  return { lopDays, balanceAfter };
}
