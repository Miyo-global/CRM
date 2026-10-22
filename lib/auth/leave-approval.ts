import "server-only";

import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { AuthSession } from "@/lib/api/helpers";
import { canActOnLeave } from "@/lib/hr/leave-approvers";

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

/**
 * API-side counterpart of `canActOnLeave`: the UI showed Approve to the routed
 * approver or the requester's manager while this check allowed only HR and
 * leadership, so a routed manager was permanently blocked (QA-0004). Both now
 * apply the same rule.
 */
export async function canApproveLeaveRequest(
  session: AuthSession,
  request: { userId: string; approverId?: string | null; status?: string | null },
): Promise<{ allowed: true } | { allowed: false; message: string; status: number }> {
  if (request.userId === session.user.id) {
    return {
      allowed: false,
      message: "You cannot approve or reject your own leave request.",
      status: 403,
    };
  }

  const role = await resolveLeaveApproverRole(session);
  const [requester, approver] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, request.userId),
      columns: { id: true, role: true, reportingTo: true },
    }),
    request.approverId
      ? db.query.users.findFirst({
          where: eq(users.id, request.approverId),
          columns: { isActive: true },
        })
      : undefined,
  ]);

  const allowed = canActOnLeave(
    { id: session.user.id, role },
    {
      status: request.status ?? "PENDING",
      approverId: request.approverId ?? null,
      approver: approver ?? null,
      user: requester ?? { id: request.userId },
    },
  );

  if (!allowed) {
    return {
      allowed: false,
      message: "You are not an approver for this leave request.",
      status: 403,
    };
  }

  return { allowed: true };
}
