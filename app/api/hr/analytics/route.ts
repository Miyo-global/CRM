import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  organizationMembers, users, attendance, leaveRequests,
  payrolls, departments, expenses,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { cached, HR_CACHE, CACHE_TTL } from "@/lib/hr-cache";
import { NO_DEPARTMENT } from "@/lib/hr/department-count";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;
    const data = await cached(HR_CACHE.analytics(orgId), async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [
      totalEmployeesResult,
      activeEmployeesResult,
      deptDistribution,
      genderDistribution,
      roleDistribution,
      monthlyAttendanceResult,
      leavesByStatusResult,
      leavesByMonthResult,
      payrollCostResult,
      recentJoinsResult,
      expenseTotalResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.orgId, orgId)),

      db.select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),

      db.select({ departmentId: users.departmentId, count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.departmentId),

      db.select({ gender: users.gender, count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.gender),

      db.select({ role: users.role, count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.role),

      db.select({ count: count() })
        .from(attendance)
        .where(and(
          eq(attendance.orgId, orgId),
          gte(attendance.date, monthStart),
          lte(attendance.date, monthEnd)
        )),

      db.select({ status: leaveRequests.status, count: count() })
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.orgId, orgId),
          gte(leaveRequests.startDate, yearStart),
          lte(leaveRequests.startDate, yearEnd)
        ))
        .groupBy(leaveRequests.status),

      db.select({
        month: sql<string>`to_char(${leaveRequests.startDate}::date, 'YYYY-MM')`,
        count: count(),
      })
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.orgId, orgId),
          gte(leaveRequests.startDate, yearStart),
          lte(leaveRequests.startDate, yearEnd)
        ))
        .groupBy(sql`to_char(${leaveRequests.startDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${leaveRequests.startDate}::date, 'YYYY-MM')`),

      db.select({ total: sql<string>`COALESCE(SUM(${payrolls.netSalary}::numeric), 0)` })
        .from(payrolls)
        .where(and(
          eq(payrolls.orgId, orgId),
          gte(payrolls.month, `${year}-01`),
          lte(payrolls.month, `${year}-12`)
        )),

      db.select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(
          eq(organizationMembers.orgId, orgId),
          gte(users.joiningDate, monthStart)
        )),

      db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
        .from(expenses)
        .where(and(
          eq(expenses.orgId, orgId),
          eq(expenses.status, "APPROVED"),
          gte(expenses.expenseDate, yearStart),
          lte(expenses.expenseDate, yearEnd)
        )),
    ]);

    const allDepts = await db.query.departments.findMany({
      where: eq(departments.orgId, orgId),
    });
    const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

    const leavesByStatus: Record<string, number> = {};
    for (const row of leavesByStatusResult) {
      leavesByStatus[row.status ?? "UNKNOWN"] = Number(row.count);
    }

    return {
      headcount: {
        total: Number(totalEmployeesResult[0]?.count ?? 0),
        active: Number(activeEmployeesResult[0]?.count ?? 0),
        newThisMonth: Number(recentJoinsResult[0]?.count ?? 0),
      },
      // "Other" (dangling id) and "Unassigned" (none) are one "No department",
      // as on the org chart, so both pages count departments alike (QA-BUG-14).
      departments: Array.from(
        deptDistribution.reduce((acc, d) => {
          const name = (d.departmentId && deptMap.get(d.departmentId)) || NO_DEPARTMENT;
          acc.set(name, (acc.get(name) ?? 0) + Number(d.count));
          return acc;
        }, new Map<string, number>()),
        ([name, count]) => ({ name, count }),
      ),
      gender: genderDistribution.map((g) => ({
        gender: g.gender ?? "Unknown",
        count: Number(g.count),
      })),
      roles: roleDistribution.map((r) => ({
        role: r.role,
        count: Number(r.count),
      })),
      attendance: {
        totalLogsThisMonth: Number(monthlyAttendanceResult[0]?.count ?? 0),
      },
      leaves: {
        byStatus: leavesByStatus,
        byMonth: leavesByMonthResult.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
      },
      payroll: {
        totalCostYTD: payrollCostResult[0]?.total ?? "0",
      },
      expenses: {
        approvedYTD: expenseTotalResult[0]?.total ?? "0",
      },
    };
    }, { ttlSeconds: CACHE_TTL.MEDIUM });

    return ok(data);
  });
}
