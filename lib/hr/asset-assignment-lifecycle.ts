export const ASSET_REASSIGN_REASON_MIN_CHARS = 10;
export const ASSET_REASSIGN_REASON_MAX_CHARS = 500;

export function needsAssetReassignmentReason(params: {
  priorAssignmentCount: number;
  previousAssigneeId: string | null | undefined;
  nextAssigneeId: string | null | undefined;
}): boolean {
  const next = params.nextAssigneeId?.trim();
  if (!next) return false;

  const previous = params.previousAssigneeId?.trim() || null;
  if (previous === next) return false;

  if (params.priorAssignmentCount > 0) return true;
  return Boolean(previous);
}

export function validateReassignmentReason(
  reason: string | undefined,
  required: boolean,
): string | null {
  const trimmed = reason?.trim() ?? "";
  if (!required) return null;
  if (!trimmed) {
    return "Reassignment reason is required when assigning this asset to someone else";
  }
  if (trimmed.length < ASSET_REASSIGN_REASON_MIN_CHARS) {
    return `Please provide a clearer reason (at least ${ASSET_REASSIGN_REASON_MIN_CHARS} characters)`;
  }
  if (trimmed.length > ASSET_REASSIGN_REASON_MAX_CHARS) {
    return `Reason must be at most ${ASSET_REASSIGN_REASON_MAX_CHARS} characters`;
  }
  return null;
}
