/** Shared helpers for role-scoped document type requirements (mirrors Document Types admin). */

export type RoleScopedDocumentType = {
  id: number;
  name: string;
  isMandatory?: boolean | null;
  isActive?: boolean | null;
  applicableRoles?: string[] | null;
  sortOrder?: number | null;
  description?: string | null;
};

export function appliesToRole(
  docType: Pick<RoleScopedDocumentType, "applicableRoles">,
  role: string | null | undefined,
): boolean {
  const roles = docType.applicableRoles ?? [];
  if (roles.length === 0) return true;
  if (!role) return false;
  return roles.includes(role);
}

export function documentTypesForRole<T extends RoleScopedDocumentType>(
  allTypes: T[],
  role: string | null | undefined,
): T[] {
  return allTypes
    .filter((t) => t.isActive !== false)
    .filter((t) => appliesToRole(t, role))
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

export function requiredDocumentTypesForRole<T extends RoleScopedDocumentType>(
  allTypes: T[],
  role: string | null | undefined,
): T[] {
  return documentTypesForRole(allTypes, role).filter((t) => t.isMandatory === true);
}

export type RequiredDocProgress = {
  totalRequired: number;
  totalApproved: number;
  totalPendingReview: number;
  totalRejected: number;
  totalMissing: number;
  derivedStatus: "NOT_STARTED" | "IN_PROGRESS" | "APPROVED" | "NOT_REQUIRED";
};

export function progressForRequiredDocs(
  requiredTypes: RoleScopedDocumentType[],
  latestStatusByTypeId: Map<number, string | undefined>,
): RequiredDocProgress {
  const totalRequired = requiredTypes.length;

  if (totalRequired === 0) {
    return {
      totalRequired: 0,
      totalApproved: 0,
      totalPendingReview: 0,
      totalRejected: 0,
      totalMissing: 0,
      derivedStatus: "NOT_REQUIRED",
    };
  }

  let totalApproved = 0;
  let totalPendingReview = 0;
  let totalRejected = 0;
  let totalMissing = 0;

  for (const type of requiredTypes) {
    const status = latestStatusByTypeId.get(type.id);
    if (!status) {
      totalMissing++;
      continue;
    }
    if (status === "APPROVED") totalApproved++;
    else if (status === "REJECTED") totalRejected++;
    else if (status === "SUBMITTED" || status === "RE_UPLOAD_REQUESTED") totalPendingReview++;
    else totalMissing++;
  }

  let derivedStatus: RequiredDocProgress["derivedStatus"];
  if (totalApproved >= totalRequired) {
    derivedStatus = "APPROVED";
  } else if (totalPendingReview > 0 || totalApproved > 0 || totalRejected > 0) {
    derivedStatus = "IN_PROGRESS";
  } else {
    derivedStatus = "NOT_STARTED";
  }

  return {
    totalRequired,
    totalApproved,
    totalPendingReview,
    totalRejected,
    totalMissing,
    derivedStatus,
  };
}
