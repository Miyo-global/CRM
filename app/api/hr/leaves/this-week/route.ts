import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { getTodayString, fromISODateString, formatDateOnly } from "@/lib/date-utils";

export const dynamic = "force-dynamic";


export async function GET() {
  return withAuth(async (session) => {
    const today = fromISODateString(getTodayString());
    const dayOfWeek = today.getDay();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    const weekStart = formatDateOnly(weekStartDate);
    const weekEnd = formatDateOnly(weekEndDate);

    const leaves = await db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.orgId, session.orgId),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, weekEnd),
        gte(leaveRequests.endDate, weekStart),
      ),
      with: {
        user: true,
        leaveType: { columns: { id: true, name: true } },
      },
      orderBy: [desc(leaveRequests.startDate)],
      limit: 500,
    });

    return ok(leaves);
  });
}
