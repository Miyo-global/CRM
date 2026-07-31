/** Who should see the editable daily log vs the all-employee summary list. */
export function resolveWorkLogView(params: {
  role?: string | null;
  currentUserId?: string;
  selectedUserId?: string;
  viewAllTeam?: boolean;
}): {
  effectiveUserId: string | undefined;
  isMultiUser: boolean;
  isSelfView: boolean;
} {
  const { role, currentUserId, selectedUserId, viewAllTeam } = params;

  if (selectedUserId) {
    return {
      effectiveUserId: selectedUserId,
      isMultiUser: false,
      isSelfView: !!currentUserId && selectedUserId === currentUserId,
    };
  }

  if (viewAllTeam) {
    return { effectiveUserId: undefined, isMultiUser: true, isSelfView: false };
  }

  // CEO (and legacy ADMIN) default to org-wide read-only summary — no daily entry form.
  if (role === "CEO" || role === "ADMIN") {
    return { effectiveUserId: undefined, isMultiUser: true, isSelfView: false };
  }

  if (currentUserId) {
    return {
      effectiveUserId: currentUserId,
      isMultiUser: false,
      isSelfView: true,
    };
  }

  return { effectiveUserId: undefined, isMultiUser: false, isSelfView: false };
}
