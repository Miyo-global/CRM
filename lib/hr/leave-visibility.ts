import { hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";

/** What a viewer without the right sees instead of the leave type. */
export const REDACTED_LEAVE_LABEL = "On leave";

/**
 * Leave type and reason are personal (a sick leave says something about
 * health). Only the person and leave approvers see them; everyone else sees
 * "On leave" (QA-AUTH-08).
 */
export function canSeeLeaveDetails(
  viewer: { id: string | null | undefined; role: string | null | undefined },
  ownerId: string,
): boolean {
  return (!!viewer.id && viewer.id === ownerId) || hasLeaveApproverRole(viewer.role);
}
