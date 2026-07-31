import { db } from "@/lib/db";
import { holidays, leaveRequests } from "@/lib/db/schema";
import { and, eq, lte, gte } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { getPunchDayBlockReason } from "@/lib/hr/punch-day-guard";

export async function getWorkLogBlockReason(
  orgId: string,
  userId: string,
  dateStr: string,
): Promise<string | null> {
  const today = getTodayString();
  if (dateStr > today) {
    return "Cannot log work for a future date.";
  }

  const punchBlock = await getPunchDayBlockReason(orgId, dateStr);
  if (punchBlock) {
    return punchBlock.replace(
      "Regular punch in/out is disabled",
      "Work logs cannot be modified",
    );
  }

  const onLeave = await db.query.leaveRequests.findFirst({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, dateStr),
      gte(leaveRequests.endDate, dateStr),
    ),
    columns: { id: true, reason: true },
  });
  if (onLeave) {
    return "You were on approved leave on this date. Work logs cannot be modified.";
  }

  const holiday = await db.query.holidays.findFirst({
    where: and(eq(holidays.orgId, orgId), eq(holidays.date, dateStr)),
    columns: { name: true },
  });
  if (holiday) {
    return `Work logs cannot be modified on ${holiday.name ?? "a company holiday"}.`;
  }

  return null;
}

