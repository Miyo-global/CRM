import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { branches, users, targets, clientAccounts, timesheets, expenses } from "@/lib/db/schema";
import { eq, and, sql, count, gte } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!["CEO", "HR", "ADMIN"].includes(session.user.role ?? "")) {
      return err("Only CEO/HR/Admin can access branch overview", 403);
    }

    const orgId = session.orgId;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const allBranches = await db.query.branches.findMany({
      where: eq(branches.orgId, orgId),
      with: {
        branchManager: { columns: { id: true, name: true, image: true } },
        branchHr: { columns: { id: true, name: true, image: true } },
      },
    });

    const branchKpis = await Promise.all(
      allBranches.map(async (branch) => {
        const [
          employeeCountResult,
          workLogHoursResult,
          pendingExpensesResult,
          clientCountResult,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(users)
            .where(and(eq(users.branchId, branch.id), eq(users.isActive, true))),

          db
            .select({
              totalHours: sql<string>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
            })
            .from(timesheets)
            .innerJoin(users, eq(timesheets.userId, users.id))
            .where(and(
              eq(timesheets.orgId, orgId),
              eq(users.branchId, branch.id),
              gte(timesheets.date, monthStartStr),
            )),

          db
            .select({
              count: count(),
              total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
            })
            .from(expenses)
            .innerJoin(users, eq(expenses.userId, users.id))
            .where(and(
              eq(expenses.orgId, orgId),
              eq(users.branchId, branch.id),
              eq(expenses.status, "PENDING"),
            )),

          db
            .select({ count: count() })
            .from(clientAccounts)
            .where(and(eq(clientAccounts.orgId, orgId), eq(clientAccounts.branchId, branch.id))),
        ]);

        return {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          city: branch.city,
          state: branch.state,
          status: branch.status,
          branchManager: branch.branchManager,
          branchHr: branch.branchHr,
          kpis: {
            employees: employeeCountResult[0]?.count ?? 0,
            workLogHours: Number(workLogHoursResult[0]?.totalHours ?? 0),
            pendingExpenses: {
              count: pendingExpensesResult[0]?.count ?? 0,
              total: Number(pendingExpensesResult[0]?.total ?? 0),
            },
            clients: clientCountResult[0]?.count ?? 0,
          },
        };
      })
    );

    const totalEmployees = branchKpis.reduce((sum, b) => sum + b.kpis.employees, 0);
    const totalHours = branchKpis.reduce((sum, b) => sum + b.kpis.workLogHours, 0);
    const totalClients = branchKpis.reduce((sum, b) => sum + b.kpis.clients, 0);
    const activeBranches = branchKpis.filter((b) => b.status === "ACTIVE").length;

    return ok({
      summary: {
        totalBranches: allBranches.length,
        activeBranches,
        totalEmployees,
        totalWorkLogHours: totalHours,
        totalClients,
      },
      branches: branchKpis,
    });
  });
}
