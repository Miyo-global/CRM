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
async function paidLeaveDays(tx: Tx, leave: LeaveForDeduction): Promise<number | null> {
  if (!leave.leaveTypeId) return null;
  const leaveType = await tx.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, leave.leaveTypeId),
    columns: { name: true },
  });
  if (leaveType?.name === LEAVE_POLICY.UNPAID.name) return null;
  return leave.isHalfDay
    ? 0.5
    : countLeaveWorkingDays({ orgId: leave.orgId, startDate: leave.startDate, endDate: leave.endDate });
}

function balanceFor(tx: Tx, leave: LeaveForDeduction) {
  // The balance year is the leave's own year, never "now" (R3-0020).
  return tx.query.leaveBalances.findFirst({
    where: and(
      eq(leaveBalances.userId, leave.userId),
      eq(leaveBalances.leaveTypeId, leave.leaveTypeId!),
      eq(leaveBalances.year, Number(leave.startDate.slice(0, 4))),
    ),
    // The oldest row, the one uniqueLeaveBalances shows (R3-PRJ-08).
    orderBy: (b, { asc }) => [asc(b.id)],
  });
}

/**
 * Gives back what deductApprovedLeaveBalance took when an APPROVED leave is
 * moved back to PENDING or REJECTED: the paid days return to the balance and
 * the LOP days are cleared.
 */
export async function restoreApprovedLeaveBalance(
  tx: Tx,
  leave: LeaveForDeduction & { lopDays?: string | number | null },
): Promise<void> {
  const days = await paidLeaveDays(tx, leave);
  if (days == null) return;
  const balanceRecord = await balanceFor(tx, leave);
  if (!balanceRecord) return;
  const paidDays = Math.max(0, days - Number(leave.lopDays ?? 0));
  await tx
    .update(leaveBalances)
    .set({ balance: (Number(balanceRecord.balance) + paidDays).toString() })
    .where(eq(leaveBalances.id, balanceRecord.id));
  await tx.update(leaveRequests).set({ lopDays: "0" }).where(eq(leaveRequests.id, leave.id));
}

export async function deductApprovedLeaveBalance(
  tx: Tx,
  leave: LeaveForDeduction,
): Promise<{ lopDays: number; balanceAfter: number | null }> {
  const days = await paidLeaveDays(tx, leave);
  if (days == null) return { lopDays: 0, balanceAfter: null };

  const balanceRecord = await balanceFor(tx, leave);
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
