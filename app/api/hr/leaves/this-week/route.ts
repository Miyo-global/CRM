import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users, wfhRequests } from "@/lib/db/schema";
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

    // Terminated people are not "out", they are gone (same as the dashboard).
    const inactiveUsers = db.select({ id: users.id }).from(users).where(eq(users.isActive, false));
    const userColumns = { id: true, firstName: true, lastName: true, name: true, image: true } as const;

    // Every signed-in user reads this, so it carries only what the card shows:
    // `user: true` sent whole user rows and every leave reason (QA-AUTH-08).
    const leavesQuery = db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.orgId, session.orgId),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, weekEnd),
        gte(leaveRequests.endDate, weekStart),
        notInArray(leaveRequests.userId, inactiveUsers),
      ),
      columns: { id: true, userId: true, startDate: true, endDate: true, isHalfDay: true },
      with: {
        user: { columns: userColumns },
        leaveType: { columns: { id: true, name: true } },
      },
      orderBy: [desc(leaveRequests.startDate)],
      limit: 500,
    });
    // P3-whos-out-omits-wfh: approved WFH days this week, shown with a WFH badge.
    const wfhQuery = db.query.wfhRequests.findMany({
      where: and(
        eq(wfhRequests.orgId, session.orgId),
        eq(wfhRequests.status, "APPROVED"),
        gte(wfhRequests.date, weekStart),
        lte(wfhRequests.date, weekEnd),
        notInArray(wfhRequests.userId, inactiveUsers),
      ),
      columns: { id: true, userId: true, date: true },
      with: { user: { columns: userColumns } },
      limit: 500,
    });
    const [leaves, wfh] = await Promise.all([leavesQuery, wfhQuery]);

    const leaveRows = leaves.map((lv) => ({
      ...(canSeeLeaveDetails(session.user, lv.userId)
        ? lv
        : { ...lv, leaveType: { id: null, name: REDACTED_LEAVE_LABEL } }),
      kind: "LEAVE" as const,
    }));
    const wfhRows = wfh.map((w) => ({
      id: w.id,
      userId: w.userId,
      startDate: w.date,
      endDate: w.date,
      isHalfDay: false,
      user: w.user,
      leaveType: null,
      kind: "WFH" as const,
    }));
    return ok(
      [...leaveRows, ...wfhRows].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))),
    );
  });
}
