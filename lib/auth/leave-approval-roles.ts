
export const LEAVE_APPROVER_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR", "BRANCH_MANAGER"] as const;

export function hasLeaveApproverRole(role: string | null | undefined): boolean {
  return !!role && (LEAVE_APPROVER_ROLES as readonly string[]).includes(role);
}

export function canActOnLeaveRequest(
  currentRole: string | null | undefined,
  currentUserId: string | null,
  request: { status?: string | null; user?: { id?: string } | null },
): boolean {
  if (!hasLeaveApproverRole(currentRole)) return false;
  if (currentUserId && request.user?.id === currentUserId) return false;
  return request.status === "PENDING";
}

export function countActionableLeaveRequests<T extends { status?: string | null; user?: { id?: string } | null }>(
  requests: T[],
  currentRole: string | null | undefined,
  currentUserId: string | null,
): number {
  return requests.filter((req) => canActOnLeaveRequest(currentRole, currentUserId, req)).length;
}
