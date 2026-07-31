import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const [requests, balances] = await Promise.all([
      db.query.leaveRequests.findMany({
        where: and(
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.orgId, session.orgId),
        ),
        with: {
          leaveType: { columns: { id: true, name: true, daysPerYear: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
        limit: 200,
      }),
      db.query.leaveBalances.findMany({
        where: and(
          eq(leaveBalances.userId, session.user.id),
          eq(leaveBalances.orgId, session.orgId),
          eq(leaveBalances.year, new Date().getFullYear()),
        ),
        with: {
          leaveType: { columns: { id: true, name: true, daysPerYear: true } },
        },
      }),
    ]);

    return ok({ requests, balances });
  });
}
