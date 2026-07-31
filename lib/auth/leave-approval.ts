import "server-only";

import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { AuthSession } from "@/lib/api/helpers";
import { hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";

export { LEAVE_APPROVER_ROLES, hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";

export async function resolveLeaveApproverRole(
  session: AuthSession,
): Promise<string | null> {
  const sessionRole = session.user.role ?? null;

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, session.user.id),
      eq(organizationMembers.orgId, session.orgId),
    ),
    columns: { role: true },
  });

  return member?.role ?? sessionRole;
}

export async function canApproveLeaveRequest(
  session: AuthSession,
  requestUserId: string,
): Promise<{ allowed: true } | { allowed: false; message: string; status: number }> {
  if (requestUserId === session.user.id) {
    return {
      allowed: false,
      message: "You cannot approve or reject your own leave request.",
      status: 403,
    };
  }

  const role = await resolveLeaveApproverRole(session);
  if (!hasLeaveApproverRole(role)) {
    return {
      allowed: false,
      message: "Only HR or leadership can approve leave requests.",
      status: 403,
    };
  }

  return { allowed: true };
}
