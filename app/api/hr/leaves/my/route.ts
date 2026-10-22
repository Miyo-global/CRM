import { getTodayString } from "@/lib/date-utils";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, users } from "@/lib/db/schema";
import { initializeLeaveBalances } from "@/server/actions/leave-actions/leave-balance";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const balancesQuery = (userId: string, orgId: string) =>
  db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, Number(getTodayString().slice(0, 4))),
    ),
    with: {
      leaveType: { columns: { id: true, name: true, daysPerYear: true } },
    },
  });

export async function GET() {
  return withAuth(async (session) => {
    const [requests, found] = await Promise.all([
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
      balancesQuery(session.user.id, session.orgId),
    ]);

    // Anyone hired before balances were seeded at hire still gets them the
    // first time they look (V5-0008).
    let balances = found;
    if (balances.length === 0) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { joiningDate: true },
      });
      await initializeLeaveBalances(session.orgId, session.user.id, user?.joiningDate ?? new Date());
      balances = await balancesQuery(session.user.id, session.orgId);
    }

    return ok({ requests, balances });
  });
}
