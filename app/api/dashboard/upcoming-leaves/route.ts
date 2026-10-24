import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";
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
        reportingTo: users.reportingTo,
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
          // R3-SA-10: terminated / inactive people are not "out", they are gone.
          eq(users.isActive, true),
          lte(leaveRequests.startDate, horizon),
          gte(leaveRequests.endDate, today),
        ),
      )
      .orderBy(asc(leaveRequests.startDate), asc(leaveRequests.id))
      .limit(UPCOMING_LEAVE_MAX_ROWS);

    // Privacy (A30, QA-0043): HR, Admin and the CEO see the org; everyone else
    // sees their own leave and their immediate team, without the leave type or
    // the reason, which say more about a colleague than a calendar needs to.
    const isApprover = hasLeaveApproverRole(session.user.role);

    const viewer = isApprover
      ? null
      : await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { reportingTo: true },
        });

    const inMyTeam = (row: { userId: string; reportingTo: string | null }) =>
      row.userId === session.user.id ||
      row.reportingTo === session.user.id ||
      (!!viewer?.reportingTo && row.reportingTo === viewer.reportingTo);

    const visible = rows
      .filter((row) => isApprover || inMyTeam(row))
      .map(({ reportingTo: _reportingTo, ...row }) => ({
        ...row,
        leaveType: isApprover || row.userId === session.user.id ? row.leaveType : "Leave",
        reason: isApprover || row.userId === session.user.id ? row.reason : null,
      }));

    return ok(visible);
  });
}
