import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const rows = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        createdAt: leaveRequests.createdAt,
        leaveTypeName: leaveTypes.name,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.status, "PENDING")
        )
      )
      .orderBy(desc(leaveRequests.createdAt))
      .limit(10);

    return ok(rows);
  });
}
