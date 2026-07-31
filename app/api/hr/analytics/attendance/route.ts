import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, organizationMembers, users, departments } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = req.nextUrl;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;

    const mm = String(month).padStart(2, "0");
    const startDate = `${year}-${mm}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const [deptWise, dailySummary, totalPresent] = await Promise.all([
      db
        .select({
          departmentId: users.departmentId,
          count: count(),
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.userId, users.id))
        .where(and(
          eq(attendance.orgId, session.orgId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        ))
        .groupBy(users.departmentId),

      db
        .select({
          date: attendance.date,
          count: count(),
        })
        .from(attendance)
        .where(and(
          eq(attendance.orgId, session.orgId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        ))
        .groupBy(attendance.date)
        .orderBy(attendance.date),

      db
        .select({ count: count() })
        .from(attendance)
        .where(and(
          eq(attendance.orgId, session.orgId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )),
    ]);

    const allDepts = await db.query.departments.findMany({
      where: eq(departments.orgId, session.orgId),
    });
    const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

    return ok({
      year,
      month,
      totalAttendanceLogs: Number(totalPresent[0]?.count ?? 0),
      byDepartment: deptWise.map((d) => ({
        department: d.departmentId ? (deptMap.get(d.departmentId) ?? "Other") : "Unassigned",
        count: Number(d.count),
      })),
      daily: dailySummary.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  });
}
