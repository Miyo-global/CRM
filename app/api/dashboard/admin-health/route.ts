import { type NextRequest } from "next/server";
import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, expenses, tasks, users, leaveRequests, organizationMembers } from "@/lib/db/schema";
import { eq, and, isNull, lt, sql, count } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const [
      unassignedLeadsResult,
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
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.assignedToId), sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`)),

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
      unassignedLeads: unassignedLeadsResult[0]?.count ?? 0,
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
