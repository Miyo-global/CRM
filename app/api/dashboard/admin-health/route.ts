import { type NextRequest } from "next/server";
import { withRoles, ok } from "@/lib/api/helpers";
import { FULL_ACCESS_ROLES } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { expenses, tasks, users, leaveRequests, organizationMembers } from "@/lib/db/schema";
import { eq, and, lt, sql, count } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  // System Health is Super Admin / Admin only; HR is turned away.
  return withRoles(FULL_ACCESS_ROLES)(async (session) => {
    const orgId = session.orgId;

    const [
      overdueTasksResult,
      pendingExpensesResult,
      pendingLeavesResult,
      /** All org roster rows (matches `GET /api/hr/dashboard/metrics` totalEmployees). */
      rosterEmployeesResult,
      /** Active accounts only (matches HR metrics `activeEmployees` and main dashboard headcount). */
      activeEmployeesResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, "pending"), lt(tasks.dueDate, new Date()))),

      db
        .select({
          count: count(),
          totalAmount: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
        })
        .from(expenses)
        .where(and(eq(expenses.orgId, orgId), eq(expenses.status, "PENDING"))),

      db
        .select({ count: count() })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING"))),

      db
        .select({ count: count() })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, orgId)),

      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),
    ]);

    return ok({
      overdueTasks: overdueTasksResult[0]?.count ?? 0,
      pendingExpenses: {
        count: pendingExpensesResult[0]?.count ?? 0,
        totalAmount: pendingExpensesResult[0]?.totalAmount ?? "0",
      },
      pendingLeaves: pendingLeavesResult[0]?.count ?? 0,
      totalEmployees: rosterEmployeesResult[0]?.count ?? 0,
      activeEmployees: activeEmployeesResult[0]?.count ?? 0,
    });
  });
}
