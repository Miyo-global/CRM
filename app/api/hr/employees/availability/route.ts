import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { leaveRequests, leaveTypes } from "@/lib/db/schema/hr";
import { eq, and, lte, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { getTodayString } from "@/lib/date-utils";

const querySchema = z.object({
  userIds: z.string().optional(),
});

type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

export interface AvailabilityEntry {
  userId: string;
  status: AvailabilityStatus;
  leaveType?: string;
}

export async function GET(req: NextRequest) {
  return withAuth<AvailabilityEntry[]>(async (session) => {
    const q = parseQuery(req, querySchema);
    const today = getTodayString();

    let userIdList: string[] = [];
    if (q.userIds) {
      userIdList = q.userIds.split(",").map((id) => id.trim()).filter(Boolean);
    } else {
      const members = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, session.orgId));
      userIdList = members.map((m) => m.userId);
    }

    if (userIdList.length === 0) return ok([]);

    const activeLeaves = await db
      .select({
        userId: leaveRequests.userId,
        leaveTypeName: leaveTypes.name,
        isHalfDay: leaveRequests.isHalfDay,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today),
          inArray(leaveRequests.userId, userIdList),
        ),
      );

    const leaveByUser = new Map(activeLeaves.map((l) => [l.userId, l]));

    const result: AvailabilityEntry[] = userIdList.map((userId) => {
      const leave = leaveByUser.get(userId);
      if (!leave) return { userId, status: "AVAILABLE" };
      return {
        userId,
        status: leave.isHalfDay ? "HALF_DAY" : "ON_LEAVE",
        leaveType: leave.leaveTypeName ?? undefined,
      };
    });

    return ok(result);
  });
}
