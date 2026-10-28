import { isAdminOrOwner } from "@/lib/constants/roles";

/** Statuses an employee may see on a review written about them. */
export const RELEASED_REVIEW_STATUSES = ["COMPLETED", "ARCHIVED"] as const;

/**
 * Who may read one performance review: the people team, the reviewer, and the
 * reviewee once it is released. A draft stays with the reviewer until it is
 * completed (QA P2-emp-no-own-performance-view).
 */
export function canReadReview(
  review: { userId: string; reviewerId: string | null; status: string | null },
  viewer: { id: string; role: string | null | undefined },
): boolean {
  if (isAdminOrOwner(viewer.role)) return true;
  if (review.reviewerId === viewer.id) return true;
  return (
    review.userId === viewer.id &&
    (RELEASED_REVIEW_STATUSES as readonly (string | null)[]).includes(review.status)
  );
}
