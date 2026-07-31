import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { format } from "date-fns";

export async function GET() {
  return withAuth(async (session) => {
    const today = format(new Date(), "yyyy-MM-dd");

    const totalMembers = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.isActive, true)
        )
      );

    const todayAttendance = await db
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
      .where(
        and(
          eq(attendance.orgId, session.orgId),
          eq(attendance.date, today)
        )
      );

    const clockedIn = todayAttendance.filter((a) => a.checkIn && !a.checkOut).length;
    const total = totalMembers[0]?.count ?? 0;

    return ok({
      total,
      present: todayAttendance.length,
      clockedIn,
      absent: Math.max(0, total - todayAttendance.length),
      records: todayAttendance,
    });
  });
}
