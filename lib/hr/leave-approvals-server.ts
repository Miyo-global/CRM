import "server-only";

import { db } from "@/lib/db";
import { leaveRequests, organizationMembers, users } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ROLES } from "@/lib/constants/roles";
import {
  autoApprovesUnroutedLeave,
  canActOnLeave,
  leaveApproverRolesFor,
  type LeaveViewer,
} from "./leave-approvers";
import { resolveLeaveApprovers } from "./leave-approver-chain";

const approvers = alias(users, "approver");

/** Pending requests the viewer may act on, with just the fields the rule needs. */
export async function listPendingLeaveApprovals(orgId: string, viewer: LeaveViewer) {
  if (!viewer.id || !viewer.role) return [];

  const rows = await db
    .select({
      id: leaveRequests.id,
      approverId: leaveRequests.approverId,
      status: leaveRequests.status,
      userId: leaveRequests.userId,
      requesterRole: users.role,
      requesterReportsTo: users.reportingTo,
      approverActive: approvers.isActive,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(users.id, leaveRequests.userId))
    .leftJoin(approvers, eq(approvers.id, leaveRequests.approverId))
    .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING")));

  return rows.filter((row) =>
    canActOnLeave(viewer, {
      status: row.status,
      approverId: row.approverId,
      approver: { isActive: row.approverActive },
      user: { id: row.userId, role: row.requesterRole, reportingTo: row.requesterReportsTo },
    }),
  );
}

/** How many pending requests the viewer may act on (A27, A28). */
export async function countPendingLeaveApprovals(
  orgId: string,
  viewer: LeaveViewer,
): Promise<number> {
  return (await listPendingLeaveApprovals(orgId, viewer)).length;
}

export interface ResolvedLeaveApprover {
  /** The user who should act on the request, when there is exactly one. */
  approverId: string | null;
  /** True only for the Super Admin of an org with no other Admin (QA-AUTH-05). */
  autoApprove: boolean;
}

/**
 * Who should approve a new request: the requester's manager when they have one,
 * otherwise the first member holding an approver role for that requester (A27).
 */
export async function resolveLeaveApprover(
  orgId: string,
  requester: { id: string; role: string | null | undefined; reportingTo?: string | null },
): Promise<ResolvedLeaveApprover> {
  // A deactivated manager is skipped: the request would sit with nobody able to
  // act on it (V5-0002).
  if (requester.reportingTo && requester.reportingTo !== requester.id) {
    const manager = await db.query.users.findFirst({
      where: eq(users.id, requester.reportingTo),
      columns: { isActive: true },
    });
    if (manager?.isActive) return { approverId: requester.reportingTo, autoApprove: false };
  }

  // Candidates come from the existing chain helper, which already drops the
  // requester and anyone on approved leave today.
  const candidates = await resolveLeaveApprovers(orgId, requester.id);
  const roles = leaveApproverRolesFor(requester.role);

  for (const role of roles) {
    const match = candidates.find((c) => c.role === role);
    if (match) return { approverId: match.id, autoApprove: false };
  }

  // Nobody free right now. Leave it PENDING and unowned so every approver role
  // sees it, unless the Super Admin is the only leader there is (QA-AUTH-05).
  // Candidates skip people on leave today, so count Admins separately.
  let otherAdminExists = false;
  if (requester.role === ROLES.CEO) {
    const other = await db
      .select({ id: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, orgId),
          eq(organizationMembers.role, ROLES.ADMIN),
          ne(organizationMembers.userId, requester.id),
        ),
      )
      .limit(1);
    otherAdminExists = other.length > 0;
  }
  return { approverId: null, autoApprove: autoApprovesUnroutedLeave(requester.role, otherAdminExists) };
}
