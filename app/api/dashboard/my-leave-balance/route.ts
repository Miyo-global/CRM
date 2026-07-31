import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const currentYear = new Date().getFullYear();

    const data = await db
      .select({
        id: leaveBalances.id,
        balance: leaveBalances.balance,
        year: leaveBalances.year,
        leaveTypeName: leaveTypes.name,
        daysPerYear: leaveTypes.daysPerYear,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveBalances.orgId, session.orgId),
          eq(leaveBalances.userId, session.user.id),
          eq(leaveBalances.year, currentYear)
        )
      );

    return ok(data);
  });
}
