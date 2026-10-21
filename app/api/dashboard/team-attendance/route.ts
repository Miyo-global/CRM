import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { getTeamDay } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    // IST today, not the server's: date-fns format() used UTC on the server,
    // so before 05:30 IST it looked at yesterday (QA-BUG-09).
    const today = getTodayString();

    const [team, todayAttendance] = await Promise.all([
      getTeamDay(session.orgId),
      db
        .select({
          userId: attendance.userId,
          userName: users.name,
          userImage: users.image,
          userDesignation: users.designation,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          status: attendance.status,
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.userId, users.id))
        .innerJoin(
          organizationMembers,
          and(eq(organizationMembers.userId, users.id), eq(organizationMembers.orgId, session.orgId)),
        )
        .where(
          and(
            eq(attendance.orgId, session.orgId),
            eq(attendance.date, today),
            eq(users.isActive, true),
            isNotNull(attendance.checkIn),
          ),
        ),
    ]);

    // Same people and the same rule as the manager widget: present means
    // checked in today; auto-absent rows used to count as present.
    const total = team.length;
    const present = team.filter((m) => m.status === "present").length;
    const clockedIn = new Set(todayAttendance.filter((a) => a.checkIn && !a.checkOut).map((a) => a.userId)).size;

    return ok({
      total,
      present,
      clockedIn,
      // People on approved leave are not absent (the manager widget shows them as leave).
      absent: team.filter((m) => m.status === "absent").length,
      onLeave: team.filter((m) => m.status === "leave").length,
      records: todayAttendance,
    });
  });
}
