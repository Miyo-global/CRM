import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, resignations, salaryLoans, users } from "@/lib/db/schema";
import { canDecideRequest } from "@/lib/auth/separation-of-duties";
import { countPendingLeaveApprovals } from "@/lib/hr/leave-approvals-server";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const pendingLeaves = await countPendingLeaveApprovals(session.orgId, {
      id: session.user.id,
      role: session.user.role,
    });

    const isHrReviewer =
      session.user.role === "HR" || session.user.role === "ADMIN";
    const resignationStatuses = isHrReviewer
      ? ["SUBMITTED", "PENDING_HR"]
      : ["HR_APPROVED"];

    const [resignationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, session.orgId),
          inArray(resignations.status, resignationStatuses as ("SUBMITTED" | "PENDING_HR" | "HR_APPROVED")[])
        )
      );

    const pendingResignations = resignationCount?.count ?? 0;

    // Loans and expense claims this user may decide, by the same rule the
    // Approve buttons use: never their own (P2-dashboard-pending-approvals-misses-loans).
    const [loanOwners, expenseOwners] = await Promise.all([
      db
        .select({ id: users.id, role: users.role })
        .from(salaryLoans)
        .innerJoin(users, eq(users.id, salaryLoans.userId))
        .where(and(eq(salaryLoans.orgId, session.orgId), eq(salaryLoans.status, "PENDING"))),
      db
        .select({ id: users.id, role: users.role, filedBy: expenses.filedBy })
        .from(expenses)
        .innerJoin(users, eq(users.id, expenses.userId))
        .where(and(eq(expenses.orgId, session.orgId), eq(expenses.status, "PENDING"))),
    ]);
    const decidable = (owner: { id: string; role: string | null }) => canDecideRequest(session.user, owner).allowed;
    const pendingLoans = loanOwners.filter(decidable).length;
    const pendingExpenses = expenseOwners.filter((e) => decidable(e) && e.filedBy !== session.user.id).length;

    return ok({
      pendingLeaves,
      pendingResignations,
      pendingLoans,
      pendingExpenses,
      total: pendingLeaves + pendingResignations + pendingLoans + pendingExpenses,
    });
  });
}
