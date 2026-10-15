
import {
  canActOnLeave,
  type LeaveRequestForApproval,
} from "@/lib/hr/leave-approvers";

export const LEAVE_APPROVER_ROLES = ["CEO", "HR", "ADMIN"] as const;

export function hasLeaveApproverRole(role: string | null | undefined): boolean {
  return !!role && (LEAVE_APPROVER_ROLES as readonly string[]).includes(role);
}

/**
 * Whether this viewer may act on this request. Delegates to the approver chain
 * so the UI, the API and the sidebar badge agree (A27, A28).
 */
export function canActOnLeaveRequest(
  currentRole: string | null | undefined,
  currentUserId: string | null,
  request: LeaveRequestForApproval,
): boolean {
  return canActOnLeave({ id: currentUserId, role: currentRole }, request);
}

export function countActionableLeaveRequests<T extends LeaveRequestForApproval>(
  requests: T[],
  currentRole: string | null | undefined,
  currentUserId: string | null,
): number {
  return requests.filter((req) => canActOnLeaveRequest(currentRole, currentUserId, req)).length;
}
