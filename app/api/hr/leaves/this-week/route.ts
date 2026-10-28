import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { eq, and, lte, gte, desc, notInArray } from "drizzle-orm";
import { getTodayString, fromISODateString, formatDateOnly } from "@/lib/date-utils";
import { canSeeLeaveDetails, REDACTED_LEAVE_LABEL } from "@/lib/hr/leave-visibility";

export const dynamic = "force-dynamic";


export async function GET() {
  return withAuth(async (session) => {
    const today = fromISODateString(getTodayString());
    const dayOfWeek = today.getDay();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    const weekStart = formatDateOnly(weekStartDate);
    const weekEnd = formatDateOnly(weekEndDate);

    // Every signed-in user reads this, so it carries only what the card shows:
    // `user: true` sent whole user rows and every leave reason (QA-AUTH-08).
    const leaves = await db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.orgId, session.orgId),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, weekEnd),
        gte(leaveRequests.endDate, weekStart),
        // Terminated people are not "out", they are gone (same as the dashboard).
        notInArray(
          leaveRequests.userId,
          db.select({ id: users.id }).from(users).where(eq(users.isActive, false)),
        ),
      ),
      columns: { id: true, userId: true, startDate: true, endDate: true, isHalfDay: true },
      with: {
        user: { columns: { id: true, firstName: true, lastName: true, name: true, image: true } },
        leaveType: { columns: { id: true, name: true } },
      },
      orderBy: [desc(leaveRequests.startDate)],
      limit: 500,
    });

    return ok(
      leaves.map((lv) =>
        canSeeLeaveDetails(session.user, lv.userId)
          ? lv
          : { ...lv, leaveType: { id: null, name: REDACTED_LEAVE_LABEL } },
      ),
    );
  });
}
