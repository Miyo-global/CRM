import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { shiftAssignments, shifts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentAssignment } from "@/lib/hr/shifts";
import { getTodayString } from "@/lib/date-utils";

/** The signed-in employee's shift today (read-only), or null. */
export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select({
        id: shiftAssignments.id,
        effectiveFrom: shiftAssignments.effectiveFrom,
        effectiveTo: shiftAssignments.effectiveTo,
        name: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        daysOfWeek: shifts.daysOfWeek,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shifts.id, shiftAssignments.shiftId))
      .where(and(eq(shiftAssignments.orgId, session.orgId), eq(shiftAssignments.userId, session.user.id)));
    return ok(currentAssignment(rows, getTodayString()));
  });
}
