import { ROLES } from "@/lib/constants/roles";

/**
 * Who approves whose leave (A27).
 *
 * A normal employee's request goes to their manager, then to HR, the CEO or an
 * admin. People who are themselves approvers cannot sign off their own leave,
 * so their requests go up: HR and Admin to the Super Admin (CEO) or another
 * Admin, and the CEO to an Admin. With no CEO in the org, an Admin's leave was
 * auto-approved; it now waits for another Admin (QA-AUTH-05).
 */
export function leaveApproverRolesFor(requesterRole: string | null | undefined): string[] {
  switch (requesterRole) {
    case ROLES.CEO:
      return [ROLES.ADMIN];
    case ROLES.ADMIN:
    case ROLES.HR:
      return [ROLES.CEO, ROLES.ADMIN];
    default:
      return [ROLES.HR, ROLES.CEO, ROLES.ADMIN];
  }
}

/**
 * Whether a request nobody is free to approve is approved on creation. Only
 * the Super Admin's, and only when the org has no other Admin at all: someone
 * has to be able to take leave, and there is nobody above them. Everyone else's
 * stays PENDING for the approver roles (QA-AUTH-05).
 */
export function autoApprovesUnroutedLeave(
  requesterRole: string | null | undefined,
  otherAdminExists: boolean,
): boolean {
  return requesterRole === ROLES.CEO && !otherAdminExists;
}

export interface LeaveViewer {
  id: string | null | undefined;
  role: string | null | undefined;
}

export interface LeaveRequestForApproval {
  status?: string | null;
  approverId?: string | null;
  /** A deactivated named approver no longer owns the request (V5-0002). */
  approver?: { isActive?: boolean | null } | null;
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

  // The requester's own manager can always act, even when the request was
  // routed to someone else (V5-0003).
  if (request.user?.reportingTo && request.user.reportingTo === viewer.id) return true;

  // A named approver owns the request while they are still active.
  if (request.approverId && request.approver?.isActive !== false) {
    return request.approverId === viewer.id;
  }

  return leaveApproverRolesFor(request.user?.role).includes(viewer.role);
}

export function countActionableLeaves<T extends LeaveRequestForApproval>(
  requests: T[],
  viewer: LeaveViewer,
): number {
  return requests.filter((request) => canActOnLeave(viewer, request)).length;
}
