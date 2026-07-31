import { db } from "@/lib/db";
import { leaveRequests, organizationMembers, users } from "@/lib/db/schema";
import { ROLES } from "@/lib/constants/roles";
import { and, eq, inArray, lte, gte, notInArray } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";

const CHAIN_ROLES = [ROLES.CEO, ROLES.HR, ROLES.ADMIN] as const;

function rolePriority(role: string): number {
  switch (role) {
    case ROLES.CEO:
      return 4;
    case ROLES.HR:
      return 3;
    case ROLES.ADMIN:
      return 2;
    default:
      return 1;
  }
}

async function getUserIdsOnApprovedLeaveToday(orgId: string): Promise<Set<string>> {
  const today = formatDateOnly(new Date());
  const onLeave = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, today),
      gte(leaveRequests.endDate, today),
    ),
    columns: { userId: true },
  });
  return new Set(onLeave.map((r) => r.userId));
}

export async function resolveLeaveApprovers(
  orgId: string,
  requesterUserId: string,
): Promise<Array<{ id: string; name: string | null; email: string | null; role: string }>> {
  const onLeaveIds = await getUserIdsOnApprovedLeaveToday(orgId);

  const members = await db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, [...CHAIN_ROLES]),
      ),
    );

  const eligible = members.filter(
    (m) =>
      m.userId !== requesterUserId &&
      !onLeaveIds.has(m.userId),
  );

  eligible.sort((a, b) => rolePriority(b.role) - rolePriority(a.role));

  return eligible.map((m) => ({
    id: m.userId,
    name: m.name,
    email: m.email,
    role: m.role,
  }));
}
