import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { and, eq, lte, gte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { canSeeLeaveDetails } from "@/lib/hr/leave-visibility";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const today = formatDateOnly(new Date());

    const rows = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        leaveTypeId: leaveRequests.leaveTypeId,
        employeeName: users.name,
        employeeDesignation: users.designation,
        employeeImage: users.image,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today)
        )
      );

    // Every signed-in user can call this: the leave type stays with the person
    // and leave approvers, as on Who's Out and the calendar (R2-EMP-08).
    return ok(
      rows.map(({ userId, ...row }) =>
        canSeeLeaveDetails(session.user, userId) ? row : { ...row, leaveTypeId: null },
      ),
    );
  });
}
