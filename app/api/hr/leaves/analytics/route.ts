import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users, departments } from "@/lib/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!["CEO", "ADMIN", "HR", "BRANCH_HR", "BRANCH_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const currentYear = new Date().getFullYear();
    const year = parseInt(searchParams.get("year") ?? String(currentYear));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return err("Invalid year.", 400);
    }

    const cacheKey = `hr:leave-analytics:${session.orgId}:${year}`;
    const data = await cached(cacheKey, async () => {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const byDept = await db
        .select({
          department: sql<string>`COALESCE(${departments.name}, 'Unassigned')`,
          total: count(leaveRequests.id),
          approved: sql<number>`SUM(CASE WHEN ${leaveRequests.status} = 'APPROVED' THEN 1 ELSE 0 END)`.mapWith(Number),
          pending: sql<number>`SUM(CASE WHEN ${leaveRequests.status} = 'PENDING' THEN 1 ELSE 0 END)`.mapWith(Number),
          rejected: sql<number>`SUM(CASE WHEN ${leaveRequests.status} = 'REJECTED' THEN 1 ELSE 0 END)`.mapWith(Number),
        })
        .from(leaveRequests)
        .innerJoin(users, eq(users.id, leaveRequests.userId))
        .leftJoin(
          departments,
          and(eq(users.departmentId, departments.id), eq(departments.orgId, session.orgId)),
        )
        .where(
          and(
            eq(leaveRequests.orgId, session.orgId),
            gte(leaveRequests.startDate, yearStart),
            lte(leaveRequests.startDate, yearEnd),
          ),
        )
        .groupBy(sql`COALESCE(${departments.name}, 'Unassigned')`);

      const monthly = await db
        .select({
          month: sql<string>`TO_CHAR(${leaveRequests.startDate}::date, 'Mon')`,
          monthNum: sql<number>`EXTRACT(MONTH FROM ${leaveRequests.startDate}::date)`.mapWith(Number),
          count: count(leaveRequests.id),
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.orgId, session.orgId),
            eq(leaveRequests.status, "APPROVED"),
            gte(leaveRequests.startDate, yearStart),
            lte(leaveRequests.startDate, yearEnd),
          ),
        )
        .groupBy(
          sql`TO_CHAR(${leaveRequests.startDate}::date, 'Mon')`,
          sql`EXTRACT(MONTH FROM ${leaveRequests.startDate}::date)`,
        )
        .orderBy(sql`EXTRACT(MONTH FROM ${leaveRequests.startDate}::date)`);

      return {
        year,
        byDepartment: byDept,
        monthlyTrend: monthly.map((m) => ({ month: m.month, count: m.count })),
      };
    });

    return ok(data);
  });
}
