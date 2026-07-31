"server-only";

import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LeavesResult, LeaveBalance } from "@/types/hr";

export async function getLeaves(orgId: string, userId: string): Promise<LeavesResult> {
  const [balances, types, requests] = await Promise.all([
    db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.orgId, orgId)
      ),
    }),
    db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, orgId),
    }),
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId)
      ),
      orderBy: [desc(leaveRequests.createdAt)],
    }),
  ]);

  return {
    balances: balances as unknown as LeaveBalance[],
    types: types as unknown as import("@/types/hr").LeaveType[],
    requests: requests as unknown as import("@/types/hr").LeaveRequest[],
  };
}

export async function getLeaveBalance(orgId: string, userId: string): Promise<LeaveBalance[]> {
  return db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, new Date().getFullYear())
    ),
  }) as unknown as Promise<LeaveBalance[]>;
}
