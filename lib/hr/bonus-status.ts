/**
 * Bonus lifecycle (R2-CRUD-05): Pending → Approved → Paid. A pending bonus can
 * also be rejected, and a pending or approved one cancelled; paid, rejected and
 * cancelled are final. Mark Paid used to accept a pending bonus, skipping the
 * approval the summary counts as "Approved – awaiting payment".
 */
export const BONUS_STATUSES = ["PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"] as const;
export type BonusStatus = (typeof BONUS_STATUSES)[number];

const NEXT: Partial<Record<BonusStatus, readonly BonusStatus[]>> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PAID", "CANCELLED"],
};

/** Bonuses that still count as open, for the duplicate guard (R2-HR-06). */
export const OPEN_BONUS_STATUSES: BonusStatus[] = ["PENDING", "APPROVED"];

export function canMoveBonus(from: string | null, to: BonusStatus): boolean {
  return NEXT[(from ?? "PENDING") as BonusStatus]?.includes(to) ?? false;
}

/** Why a bonus cannot move from `from` to `to`, or null when it can. */
export function bonusTransitionError(from: string | null, to: BonusStatus): string | null {
  if (canMoveBonus(from, to)) return null;
  const current = from ?? "PENDING";
  if (current === "PAID") return "Bonus has already been paid.";
  if (current === "REJECTED") return "Bonus has already been rejected.";
  if (current === "CANCELLED") return "Bonus has been cancelled.";
  if (to === "PAID") return "Approve the bonus before marking it paid.";
  return `A ${current.toLowerCase()} bonus cannot be ${to.toLowerCase()}.`;
}
