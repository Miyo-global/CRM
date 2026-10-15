import "server-only";

import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { canActOnLeave, leaveApproverRolesFor, type LeaveViewer } from "./leave-approvers";
import { resolveLeaveApprovers } from "./leave-approver-chain";

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
    })
    .from(leaveRequests)
    .leftJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING")));

  return rows.filter((row) =>
    canActOnLeave(viewer, {
      status: row.status,
      approverId: row.approverId,
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
  /** True when nobody in the org can approve it, so it is approved on creation. */
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
  if (requester.reportingTo && requester.reportingTo !== requester.id) {
    return { approverId: requester.reportingTo, autoApprove: false };
  }

  // Candidates come from the existing chain helper, which already drops the
  // requester and anyone on approved leave today.
  const candidates = await resolveLeaveApprovers(orgId, requester.id);
  const roles = leaveApproverRolesFor(requester.role);

  for (const role of roles) {
    const match = candidates.find((c) => c.role === role);
    if (match) return { approverId: match.id, autoApprove: false };
  }

  // Nobody holds an approver role for this requester — the CEO of a one-person
  // leadership team. Approve on creation rather than leaving it stuck (A27).
  return { approverId: null, autoApprove: true };
}
