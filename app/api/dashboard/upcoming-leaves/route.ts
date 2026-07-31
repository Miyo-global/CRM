import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { addDays } from "date-fns";
import type { NextRequest } from "next/server";

const UPCOMING_LEAVE_WINDOW_DAYS = 30;
const UPCOMING_LEAVE_MAX_ROWS = 20;

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const today = formatDateOnly(new Date());
    const horizon = formatDateOnly(addDays(new Date(), UPCOMING_LEAVE_WINDOW_DAYS));

    const rows = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        leaveType: leaveTypes.name,
        userName: users.name,
        userDesignation: users.designation,
        userImage: users.image,
        reason: leaveRequests.reason,
        isHalfDay: leaveRequests.isHalfDay,
        halfDayPeriod: leaveRequests.halfDayPeriod,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, horizon),
          gte(leaveRequests.endDate, today),
        ),
      )
      .orderBy(asc(leaveRequests.startDate), asc(leaveRequests.id))
      .limit(UPCOMING_LEAVE_MAX_ROWS);

    return ok(rows);
  });
}
