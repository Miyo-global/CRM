import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { attendance, leaveRequests, performanceReviews } from "@/lib/db/schema/hr";
import { eq, and, avg, count, gte, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { subDays, format, eachDayOfInterval, isWeekend } from "date-fns";

function countWeekdays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

export interface ManagerScorecard {
  managerId: string;
  teamSize: number;
  avgPerformanceRating: number | null;
  teamAttendanceRate: number | null;
  pendingLeaveRequests: number;
  directReports: Array<{
    id: string;
    name: string | null;
    image: string | null;
    designation: string | null;
    avgRating: number | null;
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  return withAuth<ManagerScorecard>(async (session) => {
    const { employeeId } = await params;

    const isSelf = session.user.id === employeeId;
    if (!isSelf && !isAdminOrOwner(session.user.role)) {
      return err("Access denied", 403);
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, employeeId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!member) return err("Employee not found", 404);

    const reports = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.reportingTo, employeeId),
          eq(users.isActive, true),
        ),
      );

    if (reports.length === 0) {
      return ok({
        managerId: employeeId,
        teamSize: 0,
        avgPerformanceRating: null,
        teamAttendanceRate: null,
        pendingLeaveRequests: 0,
        directReports: [],
      });
    }

    const reportIds = reports.map((r) => r.id);

    const ratingRows = await db
      .select({
        userId: performanceReviews.userId,
        avg: avg(performanceReviews.overallRating),
      })
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.orgId, session.orgId),
          inArray(performanceReviews.userId, reportIds),
        ),
      )
      .groupBy(performanceReviews.userId);
    const ratingsPerReport = reportIds.map((userId) => {
      const row = ratingRows.find((r) => r.userId === userId);
      return { userId, avg: row?.avg ? parseFloat(String(row.avg)) : null };
    });

    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const [attendanceResult] = await db
      .select({ cnt: count() })
      .from(attendance)
      .where(
        and(
          eq(attendance.orgId, session.orgId),
          inArray(attendance.userId, reportIds),
          gte(attendance.date, thirtyDaysAgo),
          eq(attendance.status, "PRESENT"),
        ),
      );
    const totalPresent = attendanceResult?.cnt ?? 0;
    const workingDaysPerReport = countWeekdays(subDays(new Date(), 30), new Date());
    const maxPossible = reportIds.length * workingDaysPerReport;
    const teamAttendanceRate = maxPossible > 0 ? Math.min(100, Math.round((totalPresent / maxPossible) * 100)) : null;

    const [pendingResult] = await db
      .select({ cnt: count() })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "PENDING"),
          eq(leaveRequests.approverId, employeeId),
        ),
      );
    const pendingLeaveRequests = pendingResult?.cnt ?? 0;

    const ratingValues = ratingsPerReport.map((r) => r.avg).filter((v): v is number => v !== null);
    const avgPerformanceRating = ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : null;

    const directReports = reports.map((r) => ({
      ...r,
      avgRating: ratingsPerReport.find((rr) => rr.userId === r.id)?.avg ?? null,
    }));

    return ok({
      managerId: employeeId,
      teamSize: reports.length,
      avgPerformanceRating,
      teamAttendanceRate,
      pendingLeaveRequests,
      directReports,
    });
  });
}
