import { ROLES } from "@/lib/constants/roles";

/**
 * Who approves whose leave (A27).
 *
 * A normal employee's request goes to their manager, then to HR, the CEO or an
 * admin. People who are themselves approvers cannot sign off their own leave,
 * so their requests go up: HR and Admin to the CEO, and the CEO to an Admin
 * (auto-approved when the org has no Admin).
 */
export function leaveApproverRolesFor(requesterRole: string | null | undefined): string[] {
  switch (requesterRole) {
    case ROLES.CEO:
      return [ROLES.ADMIN];
    case ROLES.ADMIN:
    case ROLES.HR:
      return [ROLES.CEO];
    default:
      return [ROLES.HR, ROLES.CEO, ROLES.ADMIN];
  }
}

export interface LeaveViewer {
  id: string | null | undefined;
  role: string | null | undefined;
}

export interface LeaveRequestForApproval {
  status?: string | null;
  approverId?: string | null;
  user?: { id?: string | null; role?: string | null; reportingTo?: string | null } | null;
}

/**
 * Whether this viewer may approve or reject this request. The sidebar badge,
 * the approvals list, the dashboard count and the API all use this one rule, so
 * the numbers agree (A28).
 */
export function canActOnLeave(viewer: LeaveViewer, request: LeaveRequestForApproval): boolean {
  if (request.status !== "PENDING") return false;
  if (!viewer.id || !viewer.role) return false;
  if (request.user?.id && request.user.id === viewer.id) return false;

  // A named approver owns the request.
  if (request.approverId) return request.approverId === viewer.id;

  // The requester's own manager can always act.
  if (request.user?.reportingTo && request.user.reportingTo === viewer.id) return true;

  return leaveApproverRolesFor(request.user?.role).includes(viewer.role);
}

export function countActionableLeaves<T extends LeaveRequestForApproval>(
  requests: T[],
  viewer: LeaveViewer,
): number {
  return requests.filter((request) => canActOnLeave(viewer, request)).length;
}
